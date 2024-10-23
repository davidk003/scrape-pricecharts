// const csvjson = require('csvjson');
import { json } from '@sveltejs/kit';
import csvjson from 'csvjson';
let running = false;
let setName = "";
let csvData:string = "";

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
    prices = JSON.stringify(prices); //Maybe comment out not for csv?
    let attributeSplit = priceChartingProduct.productName.split(/[\[\]]/, 3)
    let name: string = "NULL";
    let trait: string = "NULL";
    let num: string = "NULL";
    if(attributeSplit.length === 3)
    {
        // console.log(attributeSplit)
        name = attributeSplit[0]
        num = attributeSplit[2];
        trait = attributeSplit[1];
    }
    else if(attributeSplit.length === 1) //No trait
    {
        let attributeSplit = priceChartingProduct.productName.split(" ", 2)
        name = attributeSplit[0]
        num = attributeSplit[1];
    }
    else //No num or trait
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
const scraped:any = [];
const scrapedCards: PokemonCard[] = [];
async function recurseCursor(cursor=0)
{
    running = true;
    let newURL = `https://www.pricecharting.com/console/${setName}?sort=model-number&cursor=${cursor}&format=json`;
    console.log(cursor);
    await fetch(newURL)
      .then(res => {console.log(res);return res.json()})
      .then(data => {
          try{
            console.log(data.cursor);
            if(data.cursor)
            {
                scraped.push(data);
                data.products.forEach((product: any) => {
                    scrapedCards.push(jsonToPokemonCard(product));
                });
                recurseCursor(data.cursor);
            }
            else
            {
                // console.log(scrapedCards);
                // console.log(scraped[0])
                scrapedCards.forEach(card => {if(card.name === card.fullName){console.log(`LIKELY ERROR CARD: ${card.name}`)}});
                csvData = csvjson.toCSV(JSON.stringify(scrapedCards), {headers: 'key'});

                running = false;
            }
          }
          catch{
            console.log("Error")
            running = false;
          }
      })
      .catch(error => {
        console.error('Error:', error);
        running = false;
    });
    console.log(`Recurse cursor:${cursor} done`)
}

async function runScraperScript() {
    if(!running)
    {
        running = true;
        setName =  (document.getElementById("setName") as HTMLInputElement)?.value
        if(setName)
        {
            await recurseCursor();
        }
        running = false;
    }
    
}

export async function GET({ url }) {
    let paramInput = url.searchParams.get('set-name');
    setName = paramInput ? paramInput : "pokemon-base-set";
    let cursor: number | undefined = 0;
    // await fetch(newURL).then(res => res.json()).then(data => {console.log(data)});
    // await recurseCursor();
    // while(running){
    //     console.log(scrapedCards[scrapedCards.length - 1])
    // }
    console.log("Looping cursor")
    while(cursor !== undefined)
    {
        let newURL = `https://www.pricecharting.com/console/${setName}?sort=model-number&cursor=${cursor}&format=json`;
        await fetch(newURL)
        .then(res => res.json())
        .then(data => {
            try{
                cursor = data?.cursor;
                console.log(data.cursor);
                if(data.cursor)
                {
                    scraped.push(data);
                    data.products.forEach((product: any) => {
                        scrapedCards.push(jsonToPokemonCard(product));
                    });
                }
            }
            catch{
                console.log("Error")
                cursor = undefined;
                return json("Error")
            }
        })
      .catch(error => {console.error('Error:', error);return json("Error");});
    }
    scrapedCards.forEach(card => {if(card.name === card.fullName){console.log(`LIKELY ERROR CARD: ${card.name}`)}});
    csvData = csvjson.toCSV(JSON.stringify(scrapedCards), {headers: 'key'});
    console.log("Done")
    return json(csvData)
	// return json(paramInput ? paramInput : "No set name provided")
}
