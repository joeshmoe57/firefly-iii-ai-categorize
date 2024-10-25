import OpenAI from "openai";
import {getConfigVariable} from "./util.js";

export default class OpenAiService {
    #openAi;
    #model = "llama";

    constructor() {
        const apiKey = getConfigVariable("OPENAI_API_KEY")
	    const baseUrl = getConfigVariable("BASE_URL")

        this.#openAi = new OpenAI({
            apiKey,
	        baseURL: baseUrl
        })
    }

    async classify(allLists, destinationName, description, amount) {
        try {
	        console.log("Classifying");
            const categories = allLists.get('categories');
	        const prompt = `You are to provide a category for the following financial transaction. Here is the set of allowable categories in a comma separated list: ${categories.join(", ")}. Only respond with an item from the list and nothing else. The transaction to classify has a description of ${description} and a destination account of ${destinationName}`
            //const prompt = "Categorize this transaction from my bank account with the following description ${description}, the transaction amount ${amount} and the following destination ${destinationName}";

            const budgets = allLists.get('budgets');
            const bills = allLists.get('bills');

            const response = await this.#openAi.chat.completions.create({
                model: this.#model,
                messages: [{role: "user", content: prompt}]
	    });
                /*tools: [
		{
		    "type": "function",
		    "function": {
                        "name": "classification",
                        "description": 'Classify a financial transaction into a category, budget and if possible a bill, use only values from the lists provided.',
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "category": {
                                    "type": "string",
                                    "description": 'The category to classify the transaction into. Use only these values: ${categories.join(", ")}. Use none if no category applies.'
                                },
                                "budget": {
                                    "type": "string",
                                    "description": 'The budget to classify the transaction into. Use only these values: ${budgets.join(", ")}. Use none if no budget applies.'
                                },
                                "bill": {
                                    "type": "string",
                                    "description": 'The bill to classify the transaction into.  Use only these values: ${bills.join(", ")}.  The properties amount_min and amount_max should be equal or in_between the amount of the transaction.  For better classification, you can use the property notes to get more information of the bill.  If you found a bill that matches the transaction, use the name of the bill. Use none if no bill applies.'
                                }
                            },
                            "required": ["category", "budget", "bill"]
                        }
                    }
		}

                ]
            }
	    */

	    console.log("Response: ", response);
 	    const message = response.choices[0].message;
	    console.log("Message: ", message);
	    const category = message.content;
	    const budget = null;
	    const bill = null;

            if (categories.indexOf(category) === -1) {
                console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAIs guess: ${category}`)
                return null;
            }

            return {
                prompt,
                response: response,
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
