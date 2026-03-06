<script lang="ts">
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import {
        Button,
        Search,
        Grid,
        Row,
        Column,
        Tile,
        ClickableTile,
        InlineNotification,
        InlineLoading,
        Tag,
        NotificationQueue,
    } from "carbon-components-svelte";
    let running = false;
    let toScrape = "";
    let topSets: string[] = [];
    let queue: any;

    let scrapeProgress = { page: 0, cards: 0, done: false, retrying: false };

    interface PokemonCard {
        name: string;
        fullName: string;
        id: number;
        icon: string;
        cardSet: string;
        prices: string;
        trait: string;
        cardNumber: string;
    }

    function parsePokemonCard(product: any): PokemonCard {
        let prices: string = JSON.stringify({
            Ungraded: product.price1,
            "PSA 10": product.price2,
            "PSA 9": product.price3,
        });
        let attributeSplit = product.productName.split(/[\[\]]/, 3);
        let name = "NULL";
        let trait = "NULL";
        let num = "NULL";
        if (attributeSplit.length === 3) {
            name = attributeSplit[0];
            num = attributeSplit[2];
            trait = attributeSplit[1];
        } else if (attributeSplit.length === 1) {
            let parts = product.productName.split(" ", 2);
            name = parts[0];
            num = parts[1];
        } else {
            name = product.productName;
        }
        return {
            name,
            fullName: product.productName,
            id: product.id,
            icon: product.imageUri,
            cardSet: product.consoleUri,
            prices,
            trait,
            cardNumber: num,
        };
    }

    function toCsv(cards: PokemonCard[]): string {
        if (cards.length === 0) return "";
        const keys: (keyof PokemonCard)[] = ["name", "fullName", "id", "icon", "cardSet", "prices", "trait", "cardNumber"];
        const escape = (v: any) => {
            const s = String(v ?? "");
            return s.includes(",") || s.includes('"') || s.includes("\n")
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
        };
        const header = keys.join(",");
        const rows = cards.map(c => keys.map(k => escape(c[k])).join(","));
        return header + "\n" + rows.join("\n");
    }

    function outputAsDownload(csvText: string) {
        const blob = new Blob([csvText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${toScrape ? toScrape : "pokemon-base-set"}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    function delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const CLIENT_MAX_RETRIES = 5;
    const CLIENT_BACKOFF_MS = 1500;
    const PAGE_DELAY_MS = 200;

    async function runScraper() {
        if (!running && toScrape.trim()) {
            running = true;
            scrapeProgress = { page: 0, cards: 0, done: false, retrying: false };
            const setName = toScrape.trim();
            const scrapedCards: PokemonCard[] = [];
            let cursor: string | undefined = "0";
            let page = 0;

            try {
                while (cursor !== undefined) {
                    let data: any = null;
                    let success = false;

                    for (let attempt = 0; attempt <= CLIENT_MAX_RETRIES; attempt++) {
                        const response = await fetch(
                            `/scrape?set-name=${encodeURIComponent(setName)}&cursor=${cursor}`
                        );

                        if (response.ok) {
                            data = await response.json();
                            if (data.error) {
                                if (attempt < CLIENT_MAX_RETRIES) {
                                    scrapeProgress = { ...scrapeProgress, retrying: true };
                                    const backoff = CLIENT_BACKOFF_MS * Math.pow(2, attempt);
                                    await delay(backoff);
                                    continue;
                                }
                                throw new Error(data.error);
                            }
                            success = true;
                            scrapeProgress = { ...scrapeProgress, retrying: false };
                            break;
                        }

                        if (response.status === 429 && attempt < CLIENT_MAX_RETRIES) {
                            scrapeProgress = { ...scrapeProgress, retrying: true };
                            const backoff = CLIENT_BACKOFF_MS * Math.pow(2, attempt);
                            await delay(backoff);
                            continue;
                        }

                        throw new Error(`Server returned HTTP ${response.status}`);
                    }

                    if (!success || !data) {
                        throw new Error("Failed after retries");
                    }

                    if (data.products && Array.isArray(data.products)) {
                        for (const product of data.products) {
                            scrapedCards.push(parsePokemonCard(product));
                        }
                    }

                    cursor = data.cursor != null ? String(data.cursor) : undefined;
                    page++;

                    scrapeProgress = {
                        page,
                        cards: scrapedCards.length,
                        done: cursor === undefined,
                        retrying: false,
                    };

                    if (cursor !== undefined) {
                        await delay(PAGE_DELAY_MS);
                    }
                }

                outputAsDownload(toCsv(scrapedCards));
                queue?.add({
                    kind: "success",
                    title: "Download ready",
                    subtitle: `${setName} scraped successfully — ${scrapedCards.length} cards. CSV downloaded.`,
                    timeout: 5000,
                });
            } catch (err: any) {
                if (scrapedCards.length > 0) {
                    outputAsDownload(toCsv(scrapedCards));
                    queue?.add({
                        kind: "warning",
                        title: "Partial download",
                        subtitle: `Got ${scrapedCards.length} cards before error. Partial CSV downloaded.`,
                        timeout: 8000,
                    });
                } else {
                    queue?.add({
                        kind: "error",
                        title: "Scrape failed",
                        subtitle: `Could not scrape "${setName}". ${err?.message || "Check the set name and try again."}`,
                        timeout: 5000,
                    });
                }
            } finally {
                running = false;
            }
        }
    }

    let status = "";
    let endPointLoad = true;
    let hardcodedUrl = "";
    let showStatusBar = true;

    async function checkEndpoint() {
        try {
            const response = await fetch(hardcodedUrl);
            status = response.ok ? "success" : "error";
        } catch {
            status = "error";
        } finally {
            endPointLoad = false;
            if (status === "success") {
                setTimeout(() => { showStatusBar = false; }, 4000);
            }
        }
    }

    function dismissStatusBar() {
        showStatusBar = false;
    }

    async function getPopularSets() {
        const setUrl = "https://www.pricecharting.com/consoles-autocomplete/pokemon-cards";
        try {
            const response = await fetch(setUrl, {
                method: "GET",
                headers: { "Content-Type": "text/plain", Connection: "keep-alive" },
            });
            const data = await response.json();
            data.forEach((element: any) => {
                if (element?.label && element.label !== "all" && topSets.length < 20) {
                    topSets = [...topSets, element.label];
                }
            });
        } catch {
            // popular sets are non-critical
        }
    }

    onMount(() => {
        hardcodedUrl = `${window.location.origin}/healthcheck`;
        checkEndpoint();
        getPopularSets();
    });

    function scrapeSet(setName: string) {
        toScrape = setName;
        runScraper();
    }

    const exampleSets = [
        { name: "pokemon-base-set", description: "The original 1999 set" },
        { name: "pokemon-lost-origin", description: "Sword & Shield era" },
        { name: "pokemon-evolving-skies", description: "Popular modern set" },
        { name: "pokemon-celestial-storm", description: "Sun & Moon era" },
    ];
</script>

<NotificationQueue bind:this={queue} />

{#if showStatusBar}
    <div class="status-dropdown" transition:slide={{ duration: 300 }}>
        {#if endPointLoad}
            <div class="status-dropdown__inner status-dropdown__inner--loading">
                <InlineLoading description="Connecting to backend..." />
            </div>
        {:else if status === "success"}
            <div class="status-dropdown__inner status-dropdown__inner--success">
                <span class="status-dropdown__icon">✓</span>
                <span class="status-dropdown__text">
                    <strong>Backend connected</strong> — Ready to scrape
                </span>
                <button class="status-dropdown__dismiss" on:click={dismissStatusBar} aria-label="Dismiss">✕</button>
            </div>
        {:else}
            <div class="status-dropdown__inner status-dropdown__inner--error">
                <span class="status-dropdown__icon">!</span>
                <span class="status-dropdown__text">
                    <strong>Backend unavailable</strong> — Could not reach {hardcodedUrl}
                </span>
                <button class="status-dropdown__dismiss" on:click={dismissStatusBar} aria-label="Dismiss">✕</button>
            </div>
        {/if}
    </div>
{/if}

<Grid>
    <!-- Hero section -->
    <Row>
        <Column lg={10} md={6} sm={4}>
            <h1>Scrape Pokémon Card Prices</h1>
            <p style="margin-top: var(--cds-spacing-03); margin-bottom: var(--cds-spacing-06); color: var(--cds-text-secondary, #525252); max-width: 600px;">
                Enter a PriceCharting card set name below to scrape current market
                prices. Results are downloaded as a CSV file.
            </p>
        </Column>
    </Row>

    <!-- Search + scrape action -->
    <Row>
        <Column lg={10} md={6} sm={4}>
            <form on:submit|preventDefault={() => runScraper()} style="display: flex; gap: var(--cds-spacing-05); align-items: center;">
                <div style="flex: 1;">
                    <Search
                        placeholder="Enter set name, e.g. pokemon-base-set"
                        bind:value={toScrape}
                        disabled={running}
                    />
                </div>
                <div class="scrape-action">
                    <Button
                        type="submit"
                        disabled={running || !toScrape.trim() || status !== "success"}
                    >Scrape</Button>
                </div>
            </form>

            {#if running}
                <div class="progress-bar-container" transition:slide={{ duration: 200 }}>
                    <div class="progress-track">
                        {#if scrapeProgress.cards > 0 && !scrapeProgress.done}
                            <div class="progress-fill progress-fill--pulse"></div>
                        {:else if scrapeProgress.done}
                            <div class="progress-fill" style="width: 100%;"></div>
                        {:else}
                            <div class="progress-fill progress-fill--indeterminate"></div>
                        {/if}
                    </div>
                    <span class="progress-label">
                        {#if scrapeProgress.retrying}
                            Page {scrapeProgress.page} · {scrapeProgress.cards} cards · Rate limited, retrying...
                        {:else if scrapeProgress.cards > 0}
                            Page {scrapeProgress.page} · {scrapeProgress.cards} cards scraped{scrapeProgress.done ? " ✓" : "..."}
                        {:else}
                            Connecting to PriceCharting...
                        {/if}
                    </span>
                </div>
            {/if}
        </Column>
    </Row>

    <!-- Example sets -->
    <Row style="margin-top: var(--cds-spacing-08, 2.5rem);">
        <Column>
            <h3 class="section-heading">Quick Start Sets</h3>
            <div class="tile-grid">
                {#each exampleSets as set}
                    <ClickableTile
                        on:click={(e) => { e.preventDefault(); scrapeSet(set.name); }}
                    >
                        <strong>{set.name}</strong>
                        <p style="margin-top: var(--cds-spacing-02); font-size: 0.875rem; color: var(--cds-text-secondary, #525252);">
                            {set.description}
                        </p>
                    </ClickableTile>
                {/each}
            </div>
        </Column>
    </Row>

    <!-- Popular sets -->
    {#if topSets.length > 0}
        <Row style="margin-top: var(--cds-spacing-08, 2.5rem);">
            <Column>
                <h3 class="section-heading">Popular Sets</h3>
                <p style="font-size: 0.875rem; color: var(--cds-text-secondary, #525252); margin-bottom: var(--cds-spacing-05);">
                    Fetched from PriceCharting — click to scrape.
                </p>
                <div class="tag-grid">
                    {#each topSets as set}
                        <Tag
                            interactive
                            type="teal"
                            on:click={() => scrapeSet(set.replaceAll(" ", "-"))}
                        >{set.replaceAll(" ", "-")}</Tag>
                    {/each}
                </div>
            </Column>
        </Row>
    {/if}
</Grid>

<style>
    h1 {
        font-size: 2.625rem;
        font-weight: 300;
        line-height: 1.2;
    }
    h3 {
        font-size: 1.25rem;
        font-weight: 400;
    }

    .scrape-action {
        flex-shrink: 0;
    }

    /* ── Progress bar ── */
    .progress-bar-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 0.75rem;
    }
    .progress-track {
        flex: 1;
        height: 4px;
        background: var(--cds-border-subtle, #e0e0e0);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
    }
    .progress-fill {
        height: 100%;
        background: #0f62fe;
        border-radius: 2px;
        transition: width 0.3s ease;
    }
    .progress-fill--indeterminate {
        width: 30%;
        animation: indeterminate 1.4s ease-in-out infinite;
    }
    .progress-fill--pulse {
        width: 100%;
        animation: pulse-fill 1.8s ease-in-out infinite;
    }
    @keyframes indeterminate {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(430%); }
    }
    @keyframes pulse-fill {
        0%, 100% { opacity: 0.45; }
        50%      { opacity: 1; }
    }
    .progress-label {
        font-size: 0.75rem;
        color: var(--cds-text-secondary, #525252);
        white-space: nowrap;
        min-width: 10rem;
    }

    /* ── Status bar ── */
    .status-dropdown {
        position: fixed;
        top: 3rem;
        left: 0;
        right: 0;
        z-index: 8000;
        overflow: hidden;
    }
    .status-dropdown__inner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        line-height: 1.3;
    }
    .status-dropdown__inner--success {
        background: #defbe6;
        border-bottom: 1px solid #a7f0ba;
        color: #044317;
    }
    .status-dropdown__inner--error {
        background: #fff1f1;
        border-bottom: 1px solid #ffd7d9;
        color: #750e13;
    }
    .status-dropdown__inner--loading {
        background: var(--cds-layer-01, #f4f4f4);
        border-bottom: 1px solid var(--cds-border-subtle, #e0e0e0);
        padding: 0.5rem 1rem;
    }
    .status-dropdown__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        font-size: 0.75rem;
        font-weight: 700;
        flex-shrink: 0;
    }
    .status-dropdown__inner--success .status-dropdown__icon {
        background: #198038;
        color: #fff;
    }
    .status-dropdown__inner--error .status-dropdown__icon {
        background: #da1e28;
        color: #fff;
    }
    .status-dropdown__text {
        flex: 1;
    }
    .status-dropdown__dismiss {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        padding: 0.25rem;
        opacity: 0.7;
        color: inherit;
        flex-shrink: 0;
    }
    .status-dropdown__dismiss:hover {
        opacity: 1;
    }
</style>
