// const csvjson = require('csvjson');
import * as csvjson from 'csvjson';
// const fs = require('fs');
let running = false;
// const URL_TO_SCRAPE = `https://www.pricecharting.com/console/pokemon-base-set?cursor=${cursor}&format=json`;

// fetch(URL_TO_SCRAPE)
//   .then(res => res.json())
//   .then(data => console.log(data.cursor))
//   .catch(error => console.error('Error:', error));
let setName = "";

function outputAsDownload(csvText)
{
    const text = output.join("\n");
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    a.download = `${userName}-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click(); // Simulate a click to trigger the download
    console.log("Dumped CSV")
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function PokemonCard(name, fullName, id, icon, cardSet, prices, trait, number)
{
    this.name = name;
    this.fullName = fullName;
    this.id = id;
    this.icon = icon;
    this.cardSet = cardSet;
    this.prices = prices;
    this.trait = trait;
    this.number = number;
}

function jsonToPokemonCard(priceChartingProduct)
{
    let prices = {"Ungraded": priceChartingProduct.price1, "PSA 10": priceChartingProduct.price2, "PSA 9": priceChartingProduct.price3};
    prices = JSON.stringify(prices); //Maybe comment out not for csv?
    let attributeSplit = priceChartingProduct.productName.split(/[\[\]]/, 3)
    let name = "NULL";
    let trait = "NULL";
    let num = "NULL";
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
        no = attributeSplit[1];
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
        prices,
        trait,
        num
    );
}
const scraped = [];
const scrapedCards = [];
async function recurseCursor(cursor=0)
{
    let newURL = `https://www.pricecharting.com/console/${setName}?sort=model-number&cursor=${cursor}&format=json`;
    fetch(newURL)
      .then(res => res.json())
      .then(data => {
          console.log(data.cursor);
          if(data.cursor)
          {
            scraped.push(data);
            data.products.forEach(product => {
                scrapedCards.push(jsonToPokemonCard(product));
            });
            recurseCursor(data.cursor);
          }
          else
          {
            // console.log(scrapedCards);
            // console.log(scraped[0])
            scrapedCards.forEach(card => {if(card.name === card.fullName){console.log(`LIKELY ERROR CARD: ${card.name}`)}});

            // Convert JSON to CSV
            // console.log(JSON.stringify(scrapedCards))
            const csvData = csvjson.toCSV(JSON.stringify(scrapedCards), {headers: 'key'});
            fs.writeFile('output.csv', csvData, 'utf-8', (err) => {
            if (err) {
                console.error(err);
                return;
            }
                console.log('Conversion successful. CSV file created.');
            });
          }
      })
      .catch(error => console.error('Error:', error));
}

async function runScraperScript() {
    if(!running)
    {
        running = true;
        setName =  document.getElementById("setName").value;
        await recurseCursor();
        running = false;
    }
    
}
window.runScraperScript = runScraperScript;