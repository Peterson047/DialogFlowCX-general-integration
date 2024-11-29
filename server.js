
/*
* TODO (developer): 
* Create file ".env" in this directory with the following contents:
* PROJECT_ID = ''
* LOCATION = ''
* AGENT_ID = ''
* LANGUAGE_CODE = '' 
*/

const express = require('express');
const {SessionsClient} = require('@google-cloud/dialogflow-cx');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const path = require('path')
const bodyParser = require('body-parser');
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

const sessionClient = new SessionsClient(
    {apiEndpoint: process.env.LOCATION + "-dialogflow.googleapis.com"}
);

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const listener = app.listen(process.env.PORT, () => {
    console.log('Your Dialogflow integration server is listening on port ' +
    listener.address().port);
});

/*
*  Converts a request POST request to a JSON payload for the Dialogflow's DetectIntent endpoint
*  @param {JSON} getRequest
*  @return {JSON} 
*/
const gatewayToDetectIntent = (getRequest) => {
    const sessionId = getRequest.body.From;
    const sessionPath = sessionClient.projectLocationAgentSessionPath (
        process.env.PROJECT_ID,
        process.env.LOCATION,
        process.env.AGENT_ID,
        sessionId
    );

    const message = getRequest.body.Body;
    const languageCode = process.env.LANGUAGE_CODE;
    const request = {
        session: sessionPath,
        queryInput:
            {
                text: {
                    text: message
                },
                languageCode
            }
        };
    
    return request;
};

/*
*  Converts DetctIntent response to a JSON payload for gateway
*  @param {JSON} getResponse
*  @return {JSON} 
*/
const detectIntentToGateway = (getResponse) => {
    let reply = "";
    
    for (let responseMessage of getResponse.queryResult.responseMessages) {
        if (responseMessage.hasOwnProperty('text')) {
            reply += responseMessage.text.text;
        }
    }

    const twiml = new  MessagingResponse();
    twiml.message(reply);
    return twiml;
};

/*
*  Returns a message from a Dialogflow agent in response to a gateway message
*  @param {JSON} req
*  @return {string}
*/
const getResponseMessage = async (req) => {
    const dialogflowRequest = gatewayToDetectIntent(req);
    const [getResponse] = await sessionClient.detectIntent(dialogflowRequest);
    const twiml = detectIntentToGateway(getResponse);
    return twiml.toString();
};

app.post('/', async (req, res) => {
    const message = await getResponseMessage(req);
    console.log("MESSAGE: " + message);
    res.send(message);
});

process.on('SIGTERM', () => {
    listener.close(async ()=> {
      console.log('Closing server.');
      process.exit(0);
    });
  });

module.exports = {gatewayToDetectIntent, detectIntentToGateway};