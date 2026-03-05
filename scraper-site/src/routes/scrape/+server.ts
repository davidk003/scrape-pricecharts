import { json } from '@sveltejs/kit';
import csvjson from 'csvjson';

class PokemonCard {
    name: string;
    fullName: string;
    id: number;
    icon: string;
    cardSet: string;
    prices: string;
    trait: string;
    cardNumber: string;

    constructor(name: string, fullName: string, id: number, icon: string, cardSet: string, prices: string, trait: string, cardNumber: string) {
        this.name = name;
        this.fullName = fullName;
        this.id = id;
        this.icon = icon;
        this.cardSet = cardSet;
        this.prices = prices;
        this.trait = trait;
        this.cardNumber = cardNumber;
    }
}

function jsonToPokemonCard(priceChartingProduct: any): PokemonCard
{
    let prices:string | Object = {"Ungraded": priceChartingProduct.price1, "PSA 10": priceChartingProduct.price2, "PSA 9": priceChartingProduct.price3};
    prices = JSON.stringify(prices);
    let attributeSplit = priceChartingProduct.productName.split(/[\[\]]/, 3)
    let name: string = "NULL";
    let trait: string = "NULL";
    let num: string = "NULL";
    if(attributeSplit.length === 3)
    {
        name = attributeSplit[0]
        num = attributeSplit[2];
        trait = attributeSplit[1];
    }
    else if(attributeSplit.length === 1)
    {
        let attributeSplit = priceChartingProduct.productName.split(" ", 2)
        name = attributeSplit[0]
        num = attributeSplit[1];
    }
    else
    {
        name = priceChartingProduct.productName;
    }
    return new PokemonCard(
        name,
        priceChartingProduct.productName,
        priceChartingProduct.id,
        priceChartingProduct.imageUri,
        priceChartingProduct.consoleUri,
        prices as string,
        trait,
        num as string
    );
}

const PAGE_DELAY_MS = 250;
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 2000;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(fetchUrl: string): Promise<any> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res: Response = await fetch(fetchUrl);

        if (res.ok) {
            const contentType: string = res.headers.get('content-type') || '';
            if (!contentType.includes('json')) {
                const body: string = await res.text();
                if (body.trimStart().startsWith('<')) {
                    throw new Error(`Expected JSON but got HTML (status ${res.status})`);
                }
                return JSON.parse(body);
            }
            return await res.json();
        }

        if (res.status === 429 && attempt < MAX_RETRIES) {
            const backoff: number = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
            console.log(`Rate limited (429), retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await delay(backoff);
            continue;
        }

        if (res.status >= 400 && attempt < MAX_RETRIES) {
            const backoff: number = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
            console.log(`HTTP ${res.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await delay(backoff);
            continue;
        }

        throw new Error(`HTTP ${res.status} after ${attempt + 1} attempts`);
    }
    throw new Error(`Failed after ${MAX_RETRIES + 1} attempts`);
}

export async function GET({ url }) {
    const paramInput = url.searchParams.get('set-name');
    const setName = paramInput ? paramInput : "pokemon-base-set";
    const scrapedCards: PokemonCard[] = [];
    let cursor: string | undefined = "0";

    console.log(`Scraping: https://www.pricecharting.com/console/${setName}`)
    while(cursor !== undefined)
    {
        const newURL: string = `https://www.pricecharting.com/console/${encodeURIComponent(setName)}?sort=model-number&cursor=${cursor}&format=json`;
        try {
            const data: any = await fetchWithRetry(newURL);

            if (data.products && Array.isArray(data.products)) {
                data.products.forEach((product: any) => {
                    scrapedCards.push(jsonToPokemonCard(product));
                });
            }

            cursor = data.cursor != null ? String(data.cursor) : undefined;

            if (cursor !== undefined) {
                await delay(PAGE_DELAY_MS);
            }
        } catch (error) {
            console.error(`Scrape error for ${setName} at cursor=${cursor}:`, error);
            if (scrapedCards.length > 0) {
                console.log(`Returning ${scrapedCards.length} cards scraped before error`);
                break;
            }
            return json("Error");
        }
    }

    console.log(`Done: ${scrapedCards.length} cards scraped from ${setName}`)
    const csvData = csvjson.toCSV(JSON.stringify(scrapedCards), {headers: 'key'});
    return json(csvData);
}
