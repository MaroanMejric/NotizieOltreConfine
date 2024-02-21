const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryChatGPT(question) {
    try {
        const data = {
            model: "gpt-3.5-turbo-0125",
            messages: [{ role: "user", content: question }],
            temperature: 0.5
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const responseMessage = response.data.choices[0].message.content;
        await sleep(1000);                                                             // ho introdotto un delay per evitare di raggiungere il limite massimo di richieste per minuto che ChatGPT permette di fare con il mio piano
        return responseMessage;
    } catch (error) {
        console.error('Error querying ChatGPT:', error);                            // molto probabilmente ho raggiunto il limite di richieste per minuto
        await sleep(20000);                                                           // ho introdotto un delay per evitare di raggiungere il limite massimo di richieste per minuto che ChatGPT permette di fare con il mio piano
        return await queryChatGPT(question);
    }
}

module.exports = { queryChatGPT };