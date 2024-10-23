# form-data-management-service

This service allows your to define a form (mostly used for filtering tables) in ttl format and render it in the frontend using ember-submission-form-fields. 

## Features

- Health check endpoint to verify service status.
- Retrieve form data using UUIDs.
- Construct and retrieve metadata for forms.
- Scheduled metadata construction using cron jobs.

## Docker-compose

```yaml
  form-data-management:
    image: lblod/form-data-management-service:latest
    volumes:
      - ./config/search-query:/share/search-query # Location where you store the form.ttl form definition
      - ./data/files/form-data-meta/:/data/ # Location where meta.ttl file will get stored
    labels:
      - "logging=true"
    restart: always
    logging: *default-logging

```

### Endpoints

- **Health Check**: `GET /`  
  Returns the health status of the service.

- **Retrieve Form**: `GET /search-query-forms/:uuid`  
  Retrieves the form content based on the provided UUID.

- **Retrieve Metadata**: `GET /search-query-forms/:uuid/meta`  
  Retrieves metadata for a specific form.

- **Initiate Metadata Construction**: `POST /search-query-forms/initiate-meta-construction`  
  Manually initiates the construction of metadata.


### Environment Variables

| Variable               | Description                                           | Default Value                                                                 |
|------------------------|-------------------------------------------------------|-------------------------------------------------------------------------------|
| `DATA_DIRECTORY`       | Directory for storing data files                      | `/data`                                                                       |
| `META_CRON_PATTERN`    | Cron pattern for scheduling metadata construction     | `0 0 */2 * * *` (Every two hours)                                             |
| `BATCH_SIZE`           | Size of data batches for processing                   | `1000`                                                                        |
| `ORGANISATION_GRAPH`   | Graph URI for organization data                       | `http://mu.semte.ch/graphs/organizations/141d9d6b-54af-4d17-b313-8d1c30bc3f5b`|
| `DEFAULT_GRAPH`        | Default graph URI for the service                     | `http://lblod.data.gift/services/form-data-management-service/`               |
| `ADMINISTRATIVE_UNITS` | URI for administrative units concept scheme           | `http://lblod.data.gift/concept-schemes/7e2b965e-c824-474f-b5d5-b1c115740083` |
| `RUN_CRON_ON_START`    | Flag to run cron job on service start                 | `true`                                                                        |