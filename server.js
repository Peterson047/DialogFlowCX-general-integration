const express = require('express');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sessionClient = new SessionsClient({
    apiEndpoint: process.env.LOCATION + "-dialogflow.googleapis.com"
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Função para salvar o estado da sessão, incluindo contextos, em um arquivo JSON
const saveSession = async (sessionId, queryText, responseText, contexts) => {
    const sessionsFilePath = path.join(__dirname, 'sessions.json');
    
    try {
        // Lê o arquivo de sessões existente (se houver), e inicializa como um array vazio caso esteja vazio ou corrompido
        const data = await fs.promises.readFile(sessionsFilePath, 'utf8').catch(() => '[]');
        let sessions = [];

        // Se o arquivo não estiver vazio, tenta analisar o conteúdo como JSON
        try {
            sessions = JSON.parse(data);
        } catch (err) {
            console.error('Erro ao analisar o arquivo JSON. O arquivo pode estar corrompido.');
        }

        // Filtra ou encontra a sessão existente
        let session = sessions.find(session => session.sessionId === sessionId);
        if (!session) {
            session = { 
                sessionId, 
                interactions: [], // Aqui será a lista de interações alternadas
                contexts: [] 
            };
            sessions.push(session);
        }

        // Adiciona o par de interação (pergunta do usuário + resposta do Dialogflow) no final
        session.interactions.push({ queryText, responseText });

        // Limita o histórico a 20 interações (máximo de 20 pares de perguntas e respostas)
        if (session.interactions.length > 20) session.interactions = session.interactions.slice(-20); // Mantém as últimas 20

        // Atualiza os contextos da sessão
        session.contexts = contexts;

        // Salva o array de sessões atualizado no arquivo
        await fs.promises.writeFile(sessionsFilePath, JSON.stringify(sessions, null, 2), 'utf8');
        console.log('Sessão salva com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar a sessão:', error);
    }
};

// Função para recuperar o estado da sessão a partir do arquivo JSON
const getSessionState = async (sessionId) => {
    const sessionsFilePath = path.join(__dirname, 'sessions.json');
    
    try {
        const data = await fs.promises.readFile(sessionsFilePath, 'utf8').catch(() => '[]');
        let sessions = [];

        // Tenta analisar o arquivo como JSON
        try {
            sessions = JSON.parse(data);
        } catch (err) {
            console.error('Erro ao analisar o arquivo JSON. O arquivo pode estar corrompido.');
        }

        // Filtra a sessão atual com base no sessionId
        return sessions.find(session => session.sessionId === sessionId);
    } catch (error) {
        console.error('Erro ao recuperar o estado da sessão:', error);
        return null;
    }
};

// Função para converter a requisição POST para o formato do Dialogflow
const gatewayToDetectIntent = (getRequest, contexts) => {
    const sessionId = getRequest.body.From;
    const sessionPath = sessionClient.projectLocationAgentSessionPath(
        process.env.PROJECT_ID,
        process.env.LOCATION,
        process.env.AGENT_ID,
        sessionId
    );

    const message = getRequest.body.Body;
    const languageCode = process.env.LANGUAGE_CODE;
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message
            },
            languageCode
        },
        queryParams: {
            contexts: contexts,  // Passando os contextos
        }
    };

    return request;
};

// Função para converter a resposta do Dialogflow para um formato que o gateway entenda
const detectIntentToGateway = (getResponse) => {
    let reply = "";

    for (let responseMessage of getResponse.queryResult.responseMessages) {
        if (responseMessage.hasOwnProperty('text')) {
            reply += responseMessage.text.text;
        }
    }

    const twiml = new MessagingResponse();
    twiml.message(reply);
    return twiml;
};

// Função que retorna a mensagem do agente Dialogflow
const getResponseMessage = async (req) => {
    const sessionId = req.body.From;

    // Recupera os contextos da sessão (se houver)
    let sessionState = await getSessionState(sessionId);
    let contexts = sessionState ? sessionState.contexts : [];

    // Converte a requisição para o formato do Dialogflow
    const dialogflowRequest = gatewayToDetectIntent(req, contexts);

    // Envia a requisição para o Dialogflow e obtém a resposta
    const [getResponse] = await sessionClient.detectIntent(dialogflowRequest);

    // Atualiza os contextos com a resposta do Dialogflow
    contexts = getResponse.queryResult.outputContexts;

    // Salva a sessão com as informações de consulta, resposta e contextos
    await saveSession(sessionId, req.body.Body, getResponse.queryResult.responseMessages.map(m => m.text.text).join(" "), contexts);

    const twiml = detectIntentToGateway(getResponse);
    return twiml.toString();
};

// Endpoint para receber as requisições
app.post('/', async (req, res) => {
    const message = await getResponseMessage(req);
    console.log("MESSAGE: " + message);
    res.send(message);
});

// Encerrando o servidor com SIGTERM
process.on('SIGTERM', () => {
    listener.close(async () => {
        console.log('Closing server.');
        process.exit(0);
    });
});

const listener = app.listen(process.env.PORT, () => {
    console.log('Your Dialogflow integration server is listening on port ' +
        listener.address().port);
});

module.exports = { gatewayToDetectIntent, detectIntentToGateway };
