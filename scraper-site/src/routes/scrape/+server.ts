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
            const res: Response = await fetch(newURL);
            const data: any = await res.json();

            if (data.products && Array.isArray(data.products)) {
                data.products.forEach((product: any) => {
                    scrapedCards.push(jsonToPokemonCard(product));
                });
            }

            cursor = data.cursor != null ? String(data.cursor) : undefined;
        } catch (error) {
            console.error('Scrape fetch error:', error);
            return json("Error");
        }
    }

    console.log(`Done: ${scrapedCards.length} cards scraped from ${setName}`)
    const csvData = csvjson.toCSV(JSON.stringify(scrapedCards), {headers: 'key'});
    return json(csvData);
}
