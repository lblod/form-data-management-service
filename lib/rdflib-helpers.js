import { querySudo as query } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri, sparqlEscapeString } from 'mu';
import { parse as rdflibParse, serialize as rdflibSerialize, sym, Namespace } from 'rdflib';
import { BATCH_SIZE, DEFAULT_GRAPH } from '../config';
import { PREFIXES } from '../constants/prefixes';

export const SKOS = Namespace('http://www.w3.org/2004/02/skos/core#');
export const RDF = Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

export function serialize(store, {contentType = 'application/n-triples'} = {}) {
  return rdflibSerialize(sym(DEFAULT_GRAPH), store, undefined, contentType);
}

export function loadDataIntoStore(ttl, store, {contentType = 'text/turtle'} = {}) {
  rdflibParse(ttl, store, DEFAULT_GRAPH, contentType);
}

/**
 * Will collect all the triples for ?s (subject) from the database for the given WHERE clause.
 *
 * @param store rdflib.js store
 * @param WHERE clause to determine ?s (subject)
 */
export async function loadDataFromDBIntoStore(store, {WHERE}) {
  const count = await countTriples({PREFIXES, WHERE});
  if (count > 0) {
    console.log(`Parsing 0/${count} triples`);
    let offset = 0;
    const query = `
      ${PREFIXES.join('\n')}
      
      SELECT ?s ?p ?o
      WHERE {
        GRAPH ?g {
          ${WHERE}
          ?s ?p ?o .
        }
      }
      LIMIT ${BATCH_SIZE} OFFSET %OFFSET
    `;

    while (offset < count) {
      await parseBatch(store, query, offset);
      offset = offset + BATCH_SIZE;
      console.log(`Parsed ${offset < count ? offset : count}/${count} triples`);
    }
  }
}

async function parseBatch(store, q, offset = 0, limit = 1000) {
  const pagedQuery = q.replace('%OFFSET', offset);
  const result = await query(pagedQuery);

  if (result.results.bindings.length) {
    const ttl = result.results.bindings.map(b => selectResultToNT(b['s'], b['p'], b['o'])).join('\n');
    loadDataIntoStore(ttl, store);
  }
}

function selectResultToNT(s, p, o) {
  const subject = sparqlEscapeUri(s.value);
  const predicate = sparqlEscapeUri(p.value);
  let obj;
  if (o.type === 'uri') {
    obj = sparqlEscapeUri(o.value);
  } else {
    obj = `${sparqlEscapeString(o.value)}`;
    if (o.datatype)
      obj += `^^${sparqlEscapeUri(o.datatype)}`;
  }
  return `${subject} ${predicate} ${obj} .`;
}

async function countTriples({WHERE}) {
  const queryResult = await query(`
      ${PREFIXES.join('\n')}
      
      SELECT (COUNT(*) as ?count)
      WHERE {
        GRAPH ?g {
          ${WHERE}
          ?s ?p ?o .
        }
      }
    `);

  return parseInt(queryResult.results.bindings[0].count.value);
}