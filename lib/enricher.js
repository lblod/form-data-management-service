import { sparqlEscapeUri } from 'mu';
import { graph as RDFLibStore } from 'rdflib';
import { serialize, loadDataIntoStore } from './rdflib-helpers';
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
      console.log(`Adding concept scheme ${conceptScheme} to metadata`);
      
      const queryResult = await query(`
        ${PREFIXES.join('\n')}
        CONSTRUCT {
          ?s rdf:type ?type .
          ?s skos:inScheme ${sparqlEscapeUri(conceptScheme)} .
          ?s skos:prefLabel ?prefLabel .
        }
        WHERE {
          ?s rdf:type ?type .
          ?s skos:inScheme ${sparqlEscapeUri(conceptScheme)} .
          OPTIONAL { ?s skos:prefLabel ?prefLabel . }
        }
      `);

      console.log("Discovered ", queryResult.results?.bindings?.length, " triples for ", conceptScheme)
      loadDataIntoStore(queryResult, store);
      console.log(`Concept scheme ${conceptScheme} successfully added to the RDF store`);
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
    const queryResult = await query(`
        ${PREFIXES.join('\n')}

        CONSTRUCT {
            ?s skos:inScheme ${sparqlEscapeUri(ADMINISTRATIVE_UNITS)} .
            ?s besluit:classificatie ?classificatie .
            ?s skos:prefLabel ?prefLabel .
        }
        WHERE {
            ?s skos:inScheme ${sparqlEscapeUri(ADMINISTRATIVE_UNITS)} .
            ?s besluit:classificatie ?classificatie .
            ?s skos:prefLabel ?naam .
            
            ?classificatie skos:prefLabel ?classLabel .

            BIND(CONCAT(STR(?naam), " (", STR(?classLabel), ")") AS ?prefLabel) .
        }
    `);
    
    console.log("Discovered ", queryResult.results?.bindings?.length, " triples for ", ADMINISTRATIVE_UNITS)
    loadDataIntoStore(queryResult, store);
    console.log('Administrative units successfully constructed and added to the RDF store');
  } catch (error) {
    console.error('Error constructing administrative units:', error);
    throw error;
  }
}