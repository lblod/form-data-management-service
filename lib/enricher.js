import { sparqlEscapeUri } from 'mu';
import { graph as RDFLibStore, st } from 'rdflib';
import { loadDataFromDBIntoStore, DEFAULT_GRAPH, PREFIXES, RDF, serialize, SKOS } from './rdflib-helpers';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import fs from 'fs-extra';

const META_FILE_PATH = './share/meta.ttl';
const SHARE_DIRECTORY = './share';

const ADMINISTRATIVE_UNITES = 'http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083';

const CONCEPT_SCHEMES = [
  "http://lblod.data.gift/concept-schemes/5979ff3e-1f4c-4271-ae40-e1d2000d6412", // Subsidy applications
  "http://data.vlaanderen.be/id/conceptscheme/BestuurseenheidClassificatieCode", // Bestuurseenheid classificaties
  "http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083", // Bestuurseenheden
  "http://lblod.data.gift/concept-schemes/f7274d7f-31d5-4b02-aca8-b96481115651"  // Susidy application statuses
];

export async function getMetaData() {
  return await fs.readFile(META_FILE_PATH, 'utf8');
}

export async function constructMetaData() {
  const store = RDFLibStore();
  await constructConceptSchemes(store);
  await constructAdministrativeUnites(store);
  const content = serialize(store);

  await fs.ensureDir(SHARE_DIRECTORY);
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