import { json } from '@sveltejs/kit';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1500;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET({ url }: { url: URL }) {
    const setName: string = url.searchParams.get('set-name') || 'pokemon-base-set';
    const cursor: string = url.searchParams.get('cursor') || '0';

    const target: string = `https://www.pricecharting.com/console/${encodeURIComponent(setName)}?sort=model-number&cursor=${cursor}&format=json`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res: Response = await fetch(target);

        if (res.ok) {
            const contentType: string = res.headers.get('content-type') || '';
            if (!contentType.includes('json')) {
                const body: string = await res.text();
                if (body.trimStart().startsWith('<')) {
                    if (attempt < MAX_RETRIES) {
                        const backoff: number = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                        console.log(`Got HTML instead of JSON, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                        await delay(backoff);
                        continue;
                    }
                    return json({ error: 'Rate limited by PriceCharting' }, { status: 429 });
                }
                return new Response(body, {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const data: any = await res.json();
            return json(data);
        }

        if (res.status === 429 || res.status >= 500) {
            if (attempt < MAX_RETRIES) {
                const backoff: number = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
                console.log(`HTTP ${res.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await delay(backoff);
                continue;
            }
        }

        return json({ error: `PriceCharting returned HTTP ${res.status}` }, { status: res.status });
    }

    return json({ error: 'Failed after retries' }, { status: 502 });
}
