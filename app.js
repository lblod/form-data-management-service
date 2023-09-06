import bodyParser from 'body-parser';
import rp from 'request-promise';

import {app, errorHandler} from 'mu';
import {CronJob} from 'cron';

import {getFileContent} from "./lib/file-helpers";
import {constructMetaData, getMetaData} from "./lib/enricher";
import {waitForDatabase} from "./lib/db-helpers";



const FORMS = {
  'ebd65df9-5566-47c2-859a-ceff562881ab': 'share://search-query/config-form.ttl',
  'e025a601-b50b-4abd-a6de-d0c3b619795c': 'share://search-query/filter-form.ttl'
}

// ENV var.
const META_CRON_PATTERN = process.env.META_CONSTRUCTION_CRON_PATTERN || '0 0 */2 * * *';
export const BATCH_SIZE = parseInt(process.env.CONSTRUCT_BATCH_SIZE) || 1000;
export const ORGANISATION_GRAPH = process.env.ORGANIZATION_GRAPH || 'http://mu.semte.ch/graphs/organizations/141d9d6b-54af-4d17-b313-8d1c30bc3f5b';

app.use(bodyParser.text({
  type: function (req) {
    return /^application\/n-triples/.test(req.get('content-type'));
  }
}));

app.get('/', function (req, res) {
  res.send('form-data-management-service is healthy and working! :)');
});

app.get('/search-query-forms/:uuid', async function (req, res, next) {
  const uuid = req.params.uuid;
  try {
    const form = await getFileContent(FORMS[uuid]);
    return res.status(200).set('content-type', 'text/turtle').send(form);
  } catch (e) {
    console.log(`Something went wrong while retrieving the form for id ${uuid}`);
    console.log(e);
    return next(e);
  }
});


new CronJob(META_CRON_PATTERN, function () {
  console.log(`meta-data construction initiated by cron job at ${new Date().toISOString()}`);
  rp.post('http://localhost/search-query-forms/initiate-meta-construction');
}, null, true, 'Europe/Brussels', this, true);

app.post('/search-query-forms/initiate-meta-construction', async function (req, res) {
  try {
    await waitForDatabase();
    await constructMetaData();
    res.status(202).send().end();
  } catch (e) {
    console.log('WARNING: something went wrong while construction the meta-data.');
    console.error(e);
    res.status(500).send(e.message).end();
  }
});

app.get('/search-query-forms/:uuid/meta', async function (req, res, next) {
  try {
    const meta = await getMetaData();
    return res.status(200).set('content-type', 'application/n-triples').send(meta);
  } catch (e) {
    console.log(`Something went wrong while building the meta data`);
    console.log(e);
    return next(e);
  }
});

app.use(errorHandler);