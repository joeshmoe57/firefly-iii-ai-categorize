import OpenAI from "openai";
import {getConfigVariable} from "./util.js";

export default class OpenAiService {
    #openAi;
    #model = "firefly-assistant";

    constructor() {
        const apiKey = getConfigVariable("OPENAI_API_KEY")
	    const baseUrl = getConfigVariable("BASE_URL")

        this.#openAi = new OpenAI({
            apiKey,
	        baseURL: baseUrl
        })
    }

    async classify(allLists, description, amount) {
        try {
	        console.log("Classifying");
            const categories = allLists.get('categories');
            const budgets = allLists.get('budgets');
            const bills = allLists.get('bills');
            const prompt = `Given a financial transaction description from a bank or credit card statement, provide several things: 1) simple merchant name, which will most likely be the name of a familiar business 2) bill, only provide a blank string or a single value from this list:${bills.join(", ")} 3) budget, a blank string or a single value from this list: ${budgets.join(", ")} 4) a single category for the transaction, selected from the following allowable categories in a comma separated list: ${categories.join(", ")}.
                Reference the data file to find similar descriptions that already have these items for similar transactions to improve your accuracy. Be as reasonable and accurate as possible.
                Format the output as json using the keys "destination", "bill", "budget", "category". Only respond with the json output and no other text. "bill" and "budget" are optional fields, based on the other content. Here is an example:
                {"destination": "Airbnb","bill": "","budget": "","category": "Vacation"}
                The transaction to classify has a description of ${description}`

            const response = await this.#openAi.chat.completions.create({
                model: this.#model,
                messages: [{role: "user", content: prompt}]
	    });

	    console.log("Response: ", response);
 	    const message = response.choices[0].message;
	    console.log("Message: ", message);
        const aiContent = JSON.parse(message.content);
	    const category = aiContent.category;
        const destination = aiContent.destination;
	    const budget = aiContent.budget;
	    const bill = aiContent.bill;

            if (categories.indexOf(category) === -1) {
                console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAIs guess: ${category}`)
                return null;
            }

            return {
                prompt,
                response: response,
                destination: destination,
                category: category,
                budget: budget,
                bill: bill
            }

        } catch (error) {
            if (error.response) {
                console.error(error.response.status);
                console.error(error.response.data);
                throw new OpenAiException(error.status, error.response, error.response.data);
            } else {
                console.error(error.message);
                throw new OpenAiException(null, null, error.message);
            }
        }
    }


}

class OpenAiException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with OpenAI: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}
