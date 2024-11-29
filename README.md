# General (Text Messaging) Integration

## Setup

### Prerequisites
- This code uses the Twilio API to get text messages. 

- Follow the instructions on the [main README file](https://github.com/GoogleCloudPlatform/dialogflow-integrations#readme) for more information.
- Replace __PROJECT_ID__ with your Google Cloud project ID.
- Replace __AGENT_ID__ with your Dialogflow CX agent ID.
- Replace __LOCATION__ with your agent's location code, e.g. "us-central-1."
  
```
PROJECT_ID = ''
LOCATION = ''
AGENT_ID = ''
LANGUAGE_CODE = ''
```

### Deploying the Integration Using Cloud Run CLI

first, create a service account and download the key. Save the key as `service-account.json` in the root directory of the repository.

install the Cloud Run CLI in your local terminal.

In your local terminal, change the active directory to the repository’s root directory.

Run the following command to save the state of your repository into [GCP Container Registry](https://console.cloud.google.com/gcr/). Replace PROJECT-ID with your agent’s GCP Project ID.

```shell
gcloud builds submit --tag gcr.io/PROJECT-ID/dialogflow-integration
```

Deploy your integration to Cloud Run using the following command. Replace `PROJECT_ID` with your agent’s GCP project Id, and `DIALOGFLOW_SERIVCE_ACCOUNT` with the Service Account which you acquired in the Service Account Setup step of the [main README file](../readme.md).

```shell
gcloud beta run deploy --image gcr.io/PROJECT_ID/dialogflow-integration --service-account DIALOGFLOW_SERVICE_ACCOUNT --memory 1Gi
```

- When prompted for a target platform, select a platform by entering the corresponding number (for example, ``1`` for ``Cloud Run (fully managed)``).
 - When prompted for a region, select a region (for example, ``us-central1``).
 - When prompted for a service name hit enter to accept the default.
 - When prompted to allow unauthenticated invocations press ``y``.
 - Copy the URL given to you, and use it according to the README file in the
 given integration's folder.

``You can optionally deploy the container created on Google Cloud via the web interface. Or you can use Cloud Functions to deploy without having to create a container.``

More information can be found in Cloud Run
[documentation](https://cloud.google.com/run/docs/deploying).

You can view a list of your active integration deployments under [Cloud Run](https://console.cloud.google.com/run) in the GCP Console.

