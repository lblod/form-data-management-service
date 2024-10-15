const DATA_DIRECTORY = process.env.DATA_DIRECTORY || '/data';
const META_FILE_PATH = `${DATA_DIRECTORY}/meta.ttl`;
const META_CRON_PATTERN = process.env.META_CRON_PATTERN || '0 0 */2 * * *'; // Every two hours
export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 1000;
export const ORGANISATION_GRAPH = process.env.ORGANIZATION_GRAPH || 'http://mu.semte.ch/graphs/organizations/141d9d6b-54af-4d17-b313-8d1c30bc3f5b';
export const DEFAULT_GRAPH =  process.env.DEFAULT_GRAPH || 'http://lblod.data.gift/services/form-data-management-service/';
const ADMINISTRATIVE_UNITS = process.env.ADMINISTRATIVE_UNITS || 'http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083';

export {
  DATA_DIRECTORY,
  META_CRON_PATTERN,
  META_FILE_PATH,
  BATCH_SIZE,
  ORGANISATION_GRAPH,
  DEFAULT_GRAPH,
  ADMINISTRATIVE_UNITS
};
