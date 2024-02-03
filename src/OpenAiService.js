import {Configuration, OpenAIApi} from "openai";
import {getConfigVariable} from "./util.js";

export default class OpenAiService {
    #openAi;
    #model = "gpt-3.5-turbo-1106";

    constructor() {
        const apiKey = getConfigVariable("OPENAI_API_KEY")

        const configuration = new Configuration({
            apiKey
        });

        this.#openAi = new OpenAIApi(configuration)
    }

    async classify(allLists, destinationName, description, amount) {
        try {
            const prompt = `Categorize this transaction from my bank account with the following 
        description ${description}, the transaction amount ${amount} and the following destination ${destinationName}`;

            const categories = allLists.get('categories');
            const budgets = allLists.get('budgets');
            const bills = allLists.get('bills');

            const response = await this.#openAi.createChatCompletion({
                model: this.#model,
                messages: [{role: "user", content: prompt}],
                functions: [
                    {
                        "name": "classification",
                        "description": "Classify a financial transaction into a category, budget and if possible a bill, use only values from the lists provided.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "category": {
                                    "type": "string",
                                    "description": `The category to classify the transaction into. 
                                    Use only these values: ${categories.join(", ")}.
                                    Use none if no category applies.`
                                },
                                "budget": {
                                    "type": "string",
                                    "description": `The budget to classify the transaction into.
                                    Use only these values: ${budgets.join(", ")}.
                                    Use none if no budget applies.
                                    `
                                },
                                "bill": {
                                    "type": "string",
                                    "description": `The bill to classify the transaction into.
                                    Use only these values: ${bills.join(", ")}.
                                    The properties amount_min and amount_max should be equal or in_between the amount of the transaction.
                                    For better classification, you can use the property notes to get more information of the bill.
                                    If you found a bill that matches the transaction, use the name of the bill.
                                    Use none if no bill applies.
                                   `
                                }
                            },
                            "required": ["category", "budget", "bill"]
                        }
                    }

                ],
                function_call: {name: "classification"},
            });

            const function_call = response.data.choices[0].message.function_call;
            const json = JSON.parse(function_call.arguments);

            if (categories.indexOf(json.category) === -1 && budgets.indexOf(json.budget) === -1) {
                console.warn(`OpenAI could not classify the transaction. 
                Prompt: ${prompt}
                OpenAIs guess: ${function_call.arguments}`)
                return null;
            }

            return {
                prompt,
                response: function_call.arguments,
                category: json.category,
                budget: json.budget,
                bill: json.bill
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