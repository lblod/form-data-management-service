import { sparqlEscapeUri } from 'mu';
import { graph as RDFLibStore } from 'rdflib';
import { loadDataFromDBIntoStore, DEFAULT_GRAPH, RDF, serialize, SKOS } from './rdflib-helpers';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import fs from 'fs-extra';
import { DATA_DIRECTORY, META_FILE_PATH } from '../config';
import { CONCEPT_SCHEMES } from '../constants/concept-schemes';
import { PREFIXES } from '../constants/prefixes';
import { ADMINISTRATIVE_UNITS } from '../config';

/**
 * Reads and returns the metadata from the specified file path.
 * 
 * @returns {Promise<string>} The content of the metadata file.
 */
export async function getMetaData() {
  try {
    const data = await fs.readFile(META_FILE_PATH, 'utf8');
    console.log(`Successfully read metadata from ${META_FILE_PATH}`);
    return data;
  } catch (error) {
    console.error(`Error reading metadata from ${META_FILE_PATH}:`, error);
    throw error;
  }
}

/**
 * Constructs metadata by loading concept schemes and administrative units into an RDF store,
 * then serializes and writes the content to a file.
 * 
 * @returns {Promise<void>}
 */
export async function constructMetaData() {
  const store = RDFLibStore();
  try {
    await constructConceptSchemes(store);
    await constructAdministrativeUnits(store);
    const content = serialize(store);

    await fs.ensureDir(DATA_DIRECTORY);
    await fs.writeFile(META_FILE_PATH, content, 'utf8');
    console.log(`Metadata successfully constructed and written to ${META_FILE_PATH}`);
  } catch (error) {
    console.error('Error constructing metadata:', error);
    throw error;
  }
}

/**
 * Loads concept schemes into the provided RDF store.
 * 
 * @param {Object} store - The RDF store to load data into.
 * @returns {Promise<void>}
 */
async function constructConceptSchemes(store) {
  for (const conceptScheme of CONCEPT_SCHEMES) {
    try {
      console.log(`Adding concept scheme ${conceptScheme} to meta data`);
      await loadDataFromDBIntoStore(store, {
        WHERE: `?s skos:inScheme ${sparqlEscapeUri(conceptScheme)} .`,
      });
    } catch (error) {
      console.error(`Error loading concept scheme ${conceptScheme}:`, error);
      throw error;
    }
  }
}

/**
 * Constructs administrative units by querying the database and adding the results to the RDF store.
 * 
 * @param {Object} store - The RDF store to load data into.
 * @returns {Promise<void>}
 */
async function constructAdministrativeUnits(store) {
  try {
    const result = await query(`
${PREFIXES.join('\n')}

SELECT DISTINCT ?unit ?prefLabel
WHERE {
    GRAPH ?g {
        ?unit skos:inScheme ${sparqlEscapeUri(ADMINISTRATIVE_UNITS)} ;
            besluit:classificatie ?classificatie ;
            skos:prefLabel ?naam .
        ?classificatie skos:prefLabel ?classLabel .
    }
    BIND(CONCAT(STR(?naam), " (", STR(?classLabel), ")") AS ?prefLabel) .
}
    `);

    if (result.results.bindings.length) {
      result.results.bindings.forEach(binding => {
        const unit = store.sym(binding['unit'].value);
        const newLabel = binding['prefLabel'].value;

        store.add(unit, RDF('type'), store.sym('http://www.w3.org/2004/02/skos/core#Concept'), store.sym(DEFAULT_GRAPH));
        store.add(unit, SKOS('inScheme'), store.sym(ADMINISTRATIVE_UNITS), store.sym(DEFAULT_GRAPH));
        store.add(unit, SKOS('prefLabel'), newLabel, store.sym(DEFAULT_GRAPH));
      });
      console.log('Administrative units successfully constructed and added to the RDF store');
    } else {
      console.warn('No administrative units found to add to the RDF store');
    }
  } catch (error) {
    console.error('Error constructing administrative units:', error);
    throw error;
  }
}