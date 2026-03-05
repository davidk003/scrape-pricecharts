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

    async function runScraper() {
        if (!running && toScrape.trim()) {
            running = true;
            try {
                const response = await fetch(
                    `${window.location.origin}/scrape?set-name=${encodeURIComponent(toScrape.trim())}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "text/plain",
                            Connection: "keep-alive",
                        },
                    }
                );
                const data = await response.json();
                outputAsDownload(data);
                queue?.add({
                    kind: "success",
                    title: "Download ready",
                    subtitle: `${toScrape} scraped successfully. CSV downloaded.`,
                    timeout: 5000,
                });
            } catch (err) {
                queue?.add({
                    kind: "error",
                    title: "Scrape failed",
                    subtitle: `Could not scrape "${toScrape}". Check the set name and try again.`,
                    timeout: 5000,
                });
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
            <form on:submit|preventDefault={() => runScraper()} style="display: flex; gap: var(--cds-spacing-05); align-items: flex-start;">
                <div style="flex: 1;">
                    <Search
                        placeholder="Enter set name, e.g. pokemon-base-set"
                        bind:value={toScrape}
                        disabled={running}
                    />
                </div>
                <div style="flex-shrink: 0; padding-top: 1px;">
                    {#if running}
                        <InlineLoading description="Scraping..." />
                    {:else}
                        <Button
                            type="submit"
                            disabled={!toScrape.trim() || status !== "success"}
                        >Scrape</Button>
                    {/if}
                </div>
            </form>
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

    .status-dropdown {
        position: fixed;
        top: 3rem; /* sits directly below the Carbon Header */
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
