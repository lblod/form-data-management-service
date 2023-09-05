import { sparqlEscapeUri } from 'mu';
import { graph as RDFLibStore, st } from 'rdflib';
import { loadDataFromDBIntoStore, DEFAULT_GRAPH, PREFIXES, RDF, serialize, SKOS } from './rdflib-helpers';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import fs from 'fs-extra';

const META_FILE_PATH = './share/meta.ttl';
const ADMINISTRATIVE_UNITES = 'http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083';
const CHART_OF_ACCOUNTS = 'http://lblod.data.gift/concept-schemes/b65b15ba-6755-4cd2-bd07-2c2cf3c0e4d3';

const CONCEPT_SCHEMES = [
  'http://data.vlaanderen.be/id/conceptscheme/BestuurseenheidClassificatieCode', // Administrative Unit Classifications
  'http://data.vlaanderen.be/id/conceptscheme/BestuursorgaanClassificatieCode', // Governing Body Classifications
  'http://lblod.data.gift/concept-schemes/71e6455e-1204-46a6-abf4-87319f58eaa5', // Decision Types
  'http://lblod.data.gift/concept-schemes/c93ccd41-aee7-488f-86d3-038de890d05a', // Regulation Types
  CHART_OF_ACCOUNTS,
  'http://lblod.data.gift/concept-schemes/372797ff-917c-4572-925f-f09cc30932e6', // Provinces
  'http://lblod.data.gift/concept-schemes/3037c4f4-1c63-43ac-bfc4-b41d098b15a6' // Tax Types
];

export async function getMetaData() {
  return await fs.readFile(META_FILE_PATH, 'utf8');
}

export async function constructMetaData() {
  const store = RDFLibStore();
  await constructConceptSchemes(store);
  await constructAdministrativeUnites(store);
  await enrichChartOfAccounts(store);
  const content = serialize(store);
  await fs.writeFile(META_FILE_PATH, content, 'utf8');
}

async function constructConceptSchemes(store) {
  for (let conceptScheme of CONCEPT_SCHEMES) {
    console.log(`Adding concept scheme ${conceptScheme} to meta data`);
    await loadDataFromDBIntoStore(store, {
      WHERE: `?s skos:inScheme ${sparqlEscapeUri(conceptScheme)} .`,
    });
  }
}

async function enrichChartOfAccounts(store) {
  const charts = store.match(undefined, SKOS('inScheme'), store.sym(CHART_OF_ACCOUNTS), store.sym(DEFAULT_GRAPH)).
      map(t => t.subject);
  for (const chart of charts) {
    const label = store.any(chart, SKOS('prefLabel'), undefined, store.sym(DEFAULT_GRAPH)).value;
    const notation = store.any(chart, SKOS('notation'), undefined, store.sym(DEFAULT_GRAPH)).value;

    store.remove(st(chart, SKOS('prefLabel'), undefined, store.sym(DEFAULT_GRAPH)));
    store.add(chart, SKOS('prefLabel'), `MAR${notation} - ${label}`, store.sym(DEFAULT_GRAPH));
  }
}

async function constructAdministrativeUnites(store) {
  const result = await query(`
${PREFIXES.join('\n')}

SELECT DISTINCT ?unit ?prefLabel
WHERE {
    GRAPH ?g {
        ?unit skos:inScheme <http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083> ;
            besluit:classificatie ?classificatie ;
            skos:prefLabel ?naam .
        ?classificatie skos:prefLabel ?classLabel .
    }
    BIND(CONCAT(STR( ?naam ), " (", STR(?classLabel), ")") AS ?prefLabel ) .
}
  `);

  if (result.results.bindings.length) {
    result.results.bindings.forEach(binding => {
      const unit = store.sym(binding['unit'].value);
      const newLabel = binding['prefLabel'].value;

      store.add(unit, RDF('type'), store.sym('http://www.w3.org/2004/02/skos/core#Concept'), store.sym(DEFAULT_GRAPH));
      store.add(unit, SKOS('inScheme'), store.sym(ADMINISTRATIVE_UNITES), store.sym(DEFAULT_GRAPH));
      store.add(unit, SKOS('prefLabel'), newLabel, store.sym(DEFAULT_GRAPH));

    });
  }
}