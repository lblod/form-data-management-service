import bodyParser from 'body-parser';
import rp from 'request-promise';
import { app, errorHandler } from 'mu';
import { CronJob } from 'cron';
import { getFileContent } from './lib/file-helpers';
import { constructMetaData, getMetaData } from './lib/enricher';

// Mapping of form UUIDs to their respective file paths
const FORMS = {
  'ebd65df9-5566-47c2-859a-ceff562881ab': 'share://search-query/config-form.ttl',
  'e025a601-b50b-4abd-a6de-d0c3b619795c': 'share://search-query/filter-form.ttl'
};

app.use(bodyParser.text({
  type: req => /^application\/n-triples/.test(req.get('content-type'))
}));

/**
 * Health check endpoint
 * @route GET /
 * @returns {string} 200 - Service health status
 */
app.get('/', (req, res) => {
  res.send('form-data-management-service is healthy and working! :)');
});

/**
 * Retrieve a form based on UUID
 * @route GET /search-query-forms/:uuid
 * @param {string} uuid - UUID of the form
 * @returns {text/turtle} 200 - Form content
 * @returns {Error} 500 - Error retrieving form
 */
app.get('/search-query-forms/:uuid', async (req, res, next) => {
  const uuid = req.params.uuid;
  try {
    const form = await getFileContent(FORMS[uuid]);
    res.status(200).set('content-type', 'text/turtle').send(form);
  } catch (e) {
    console.error(`Error retrieving form for id ${uuid}:`, e);
    next(e);
  }
});

/**
 * Cron job to initiate meta-data construction at regular intervals
 * @cron META_CRON_PATTERN
 */
new CronJob(META_CRON_PATTERN, () => {
  console.log(`Meta-data construction initiated by cron job at ${new Date().toISOString()}`);
  rp.post('http://localhost/search-query-forms/initiate-meta-construction');
}, null, true, 'Europe/Brussels');

/**
 * Retrieve meta-data for a specific form
 * @route GET /search-query-forms/:uuid/meta
 * @param {string} uuid - UUID of the form
 * @returns {application/n-triples} 200 - Meta-data content
 * @returns {Error} 500 - Error building meta data
 */
app.get('/search-query-forms/:uuid/meta', async (req, res, next) => {
  try {
    const meta = await getMetaData();
    res.status(200).set('content-type', 'application/n-triples').send(meta);
  } catch (e) {
    console.error('Error building meta data:', e);
    next(e);
  }
});

/**
 * Manually initiate meta-data construction
 * @route POST /search-query-forms/initiate-meta-construction
 * @returns {void} 202 - Meta-data construction initiated
 * @returns {Error} 500 - Error constructing meta-data
 */
app.post('/search-query-forms/initiate-meta-construction', async (req, res) => {
  try {
    console.log('/** Initiating meta-data construction at', new Date().toISOString(), ' **/');
    await constructMetaData(); // Construct meta-data
    res.status(202).end(); // Respond with accepted status
  } catch (e) {
    console.error('Error constructing meta-data:', e);
    res.status(500).send(e.message).end();
  }
});

app.use(errorHandler);