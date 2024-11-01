const fs = require('node:fs');
const cheerio = require('cheerio');
function getTextContent(htmlString) {
    const $ = cheerio.load(htmlString); // Load the HTML string into cheerio
    const textContent = $('#js-tcg-id-link').text(); // Select element by id and get text content
    return textContent;
}

ids = []
try {
  const data = fs.readFileSync('ids-gethistoric.txt', 'utf8');
    ids = data.split('\r\n');
} catch (err) {
  console.error(err);
}

ids.pop() // Last is always empty from split
console.log(ids)
console.log(ids.length)
total = ids.length;
PC_URL = "https://www.pricecharting.com/game/";
async function getID(PCID){
    htmlPage = undefined;
    TCGid = undefined;
    await fetch(PC_URL + PCID)
    .then(data => data.text())
    .then(data => {
      htmlPage = data;
    })
    .catch(error => {
        // console.log(error.response);
        console.error(`Error with ${PCID}:`, error.name);
        return "ERROR";
    });
    // console.log(htmlPage);
    if(htmlPage)
    {
        // fs.writeFileSync('test.html', htmlPage);
        const LINK_ID =  "js-tcg-id-link";
        TCGid = getTextContent(htmlPage);
    }
    // TCGid = doc.getElementById("js-tcg-id-link").value;
    return TCGid;
}
let done = 0;
const logDiv = Math.round(ids.length / 20 / 50);
console.log(logDiv);

let startTime = Date.now();
let totalElapsedTime = 0;

async function processIDs(ids, batchIndex) {
    const results = new Map();
    const promises = ids.map(async (element) => {
        const data = await getID(element);
        if (data === "") {
            results.set(element, "NA");
        } else {
            results.set(element, data);
        }
        done++;
        if (done % logDiv === 0) {
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // in seconds
            totalElapsedTime += elapsedTime;
            const rate = done / totalElapsedTime; // compounding rate: total iterations / total elapsed time
            console.log(`Done ${done} out of ${ids.length} at a compounding rate of ${rate.toFixed(2)} iterations per second`);
            startTime = currentTime; // reset start time for next logDiv iterations
        }
    });

    await Promise.all(promises);
    return results;
}

async function processBatches(ids, batchSize) {
    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const batchIndex = i / batchSize;
        let batchDone = done; // Save the current done value
        let success = false;
        while (!success) {
            try {
                const results = await processIDs(batch, batchIndex);
                fs.writeFileSync(`batch_${batchIndex}.txt`, "PCID,TCGID,\n");
                results.forEach((value, key) => {
                    fs.appendFileSync(`batch_${batchIndex}.txt`, `${key},${value},\n`);
                });
                console.log(`Batch ${batchIndex} processed`);
                success = true;
            } catch (error) {
                console.error(`Error processing batch ${batchIndex}:`, error);
                done = batchDone; // Reset done to the previous value
                console.log(`Retrying batch ${batchIndex}...`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second between batches
    }
}

// Split the ids into 20 batches
const batchSize = Math.ceil(ids.length / 20);
processBatches(ids, batchSize);