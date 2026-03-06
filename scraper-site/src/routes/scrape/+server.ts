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

const PAGE_DELAY_MS = 200;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 2000;

type SendFn = (event: string, data: any) => void;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function delayWithHeartbeats(ms: number, send: SendFn, cards: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < ms) {
        const remaining: number = ms - (Date.now() - start);
        const wait: number = Math.min(HEARTBEAT_INTERVAL_MS, remaining);
        await delay(wait);
        if (Date.now() - start < ms) {
            send('heartbeat', { cards, retrying: true, waitMs: ms, elapsed: Date.now() - start });
        }
    }
}

async function fetchWithRetry(fetchUrl: string, send: SendFn, cardsSoFar: number): Promise<any> {
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

        if (attempt < MAX_RETRIES) {
            const backoff: number = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
            console.log(`HTTP ${res.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
            send('retry', { attempt: attempt + 1, maxRetries: MAX_RETRIES, status: res.status, cards: cardsSoFar });
            await delayWithHeartbeats(backoff, send, cardsSoFar);
            continue;
        }

        throw new Error(`HTTP ${res.status} after ${attempt + 1} attempts`);
    }
    throw new Error(`Failed after ${MAX_RETRIES + 1} attempts`);
}

export function GET({ url }: { url: URL }) {
    const paramInput = url.searchParams.get('set-name');
    const setName: string = paramInput ? paramInput : "pokemon-base-set";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const scrapedCards: PokemonCard[] = [];
            let cursor: string | undefined = "0";
            let page = 0;

            function send(event: string, data: any) {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            }

            console.log(`Scraping: https://www.pricecharting.com/console/${setName}`);

            while (cursor !== undefined) {
                const newURL: string = `https://www.pricecharting.com/console/${encodeURIComponent(setName)}?sort=model-number&cursor=${cursor}&format=json`;
                try {
                    const data: any = await fetchWithRetry(newURL, send, scrapedCards.length);

                    if (data.products && Array.isArray(data.products)) {
                        data.products.forEach((product: any) => {
                            scrapedCards.push(jsonToPokemonCard(product));
                        });
                    }

                    cursor = data.cursor != null ? String(data.cursor) : undefined;
                    page++;

                    const isLastPage = cursor === undefined;
                    send('progress', { page, cards: scrapedCards.length, done: isLastPage });

                    if (cursor !== undefined) {
                        await delay(PAGE_DELAY_MS);
                    }
                } catch (error) {
                    console.error(`Scrape error for ${setName} at cursor=${cursor}:`, error);
                    if (scrapedCards.length > 0) {
                        console.log(`Returning ${scrapedCards.length} cards scraped before error`);
                        break;
                    }
                    send('error', { message: `Failed to scrape ${setName}` });
                    controller.close();
                    return;
                }
            }

            console.log(`Done: ${scrapedCards.length} cards scraped from ${setName}`);
            const csvData: string = csvjson.toCSV(JSON.stringify(scrapedCards), { headers: 'key' });
            send('complete', { csv: csvData, cards: scrapedCards.length });
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
}
