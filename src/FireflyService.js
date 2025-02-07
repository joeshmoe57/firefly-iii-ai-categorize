import {getConfigVariable} from "./util.js";

export default class FireflyService {
    #BASE_URL;
    #PERSONAL_TOKEN;

    constructor() {
        this.#BASE_URL = getConfigVariable("FIREFLY_URL")
        if (this.#BASE_URL.slice(-1) === "/") {
            this.#BASE_URL = this.#BASE_URL.substring(0, this.#BASE_URL.length - 1)
        }

        this.#PERSONAL_TOKEN = getConfigVariable("FIREFLY_PERSONAL_TOKEN")
    }

    async getCategories() {
	console.log("Getting categories");
        const response = await fetch(`${this.#BASE_URL}/api/v1/categories`, {
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error("Not okay: " + response);
            throw new FireflyException(response.status, response, await response.text())
        }

        const data = await response.json();

        const categories = new Map();
        data.data.forEach(category => {
            categories.set(category.attributes.name, category.id);
        });

        return categories;
    }


    async getBudgets() {
        const response = await fetch(`${this.#BASE_URL}/api/v1/budgets`, {
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new FireflyException(response.status, response, await response.text())
        }

        const data = await response.json();

        const budgets = new Map();
        data.data.forEach(budget => {
            budgets.set(budget.attributes.name, budget.id);
        });

        return budgets;
    }

    async getBills()    {
        const response = await fetch(`${this.#BASE_URL}/api/v1/bills`, {
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new FireflyException(response.status, response, await response.text())
        }

        const data = await response.json();

        const bills = new Map();
        data.data.forEach(bill => {
            bills.set(bill.attributes.name, {
                id: bill.id,
                amount_min: bill.attributes.amount_min,
                amount_max: bill.attributes.amount_max,
                notes: bill.attributes.notes,
                active: bill.attributes.active,
            });
        });

        return bills;
    }

    async setDestinationCategoryBudgetAndBill(transactionId, transactions, destinationName, categoryId, budgetId, billId) {
        const tag = getConfigVariable("FIREFLY_TAG", "AI categorized");

        const body = {
            apply_rules: true,
            fire_webhooks: true,
            transactions: [],
        }

        transactions.forEach(transaction => {
            let tags = transaction.tags;
            if (!tags) {
                tags = [];
            }
            tags.push(tag);

            const object = {
                transaction_journal_id: transaction.transaction_journal_id,
                tags: tags,
            }

            if (destinationName !== -1) {
                object.destination_name = destinationName;
            }

            if (categoryId !== -1) {
                object.category_id = categoryId;
            }

            if (budgetId !== -1) {
                object.budget_id = budgetId;
            }

            if (billId !== -1) {
                object.bill_id = billId;
            }

            console.info("Putting: ", object);

            body.transactions.push(object);
        })

        const response = await fetch(`${this.#BASE_URL}/api/v1/transactions/${transactionId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${this.#PERSONAL_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new FireflyException(response.status, response, await response.text())
        }

        await response.json();
        console.info("Transaction updated")
    }

}

class FireflyException extends Error {
    code;
    response;
    body;

    constructor(statusCode, response, body) {
        super(`Error while communicating with Firefly III: ${statusCode} - ${body}`);

        this.code = statusCode;
        this.response = response;
        this.body = body;
    }
}