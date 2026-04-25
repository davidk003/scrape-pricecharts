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
        { name: "pokemon-base-set",      description: "The original 1999 set",       era: "Vintage" },
        { name: "pokemon-evolving-skies", description: "Most popular modern set",     era: "Sword & Shield" },
        { name: "pokemon-lost-origin",   description: "Recent high-value set",        era: "Sword & Shield" },
        { name: "pokemon-celestial-storm", description: "Sun & Moon era",             era: "Sun & Moon" },
        { name: "pokemon-xy-evolutions", description: "Fan-favourite reprint",        era: "XY" },
    ];

    const steps = [
        {
            number: "01",
            heading: "Enter a set name",
            desc: "Type the PriceCharting slug for the set you want — e.g. pokemon-base-set or pokemon-evolving-skies.",
        },
        {
            number: "02",
            heading: "Scrape",
            desc: "We fetch every card and its current market price live from PriceCharting.com.",
        },
        {
            number: "03",
            heading: "Download CSV",
            desc: "Your file downloads automatically. Open it in Excel, Google Sheets, or any data tool.",
        },
    ];
</script>

<NotificationQueue bind:this={queue} />

<!-- Status bar -->
{#if showStatusBar}
    <div class="status-dropdown" transition:slide={{ duration: 300 }}>
        {#if endPointLoad}
            <div class="status-dropdown__inner status-dropdown__inner--loading">
                <InlineLoading description="Connecting to backend…" />
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

<!-- ── Hero ──────────────────────────────────────────────────── -->
<section class="hero">
    <Grid>
        <Row>
            <Column lg={12} md={8} sm={4}>
                <h1>Pokémon Card Price Scraper</h1>
                <p class="hero-subtitle">
                    Pull current market prices from PriceCharting.com for any Pokémon
                    card set and download them as a CSV in seconds.
                </p>
                <form
                    class="search-form"
                    on:submit|preventDefault={() => runScraper()}
                >
                    <div class="search-wrap">
                        <Search
                            placeholder="e.g. pokemon-base-set"
                            bind:value={toScrape}
                            disabled={running}
                        />
                    </div>
                    <div class="btn-wrap">
                        {#if running}
                            <InlineLoading description="Scraping…" />
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
    </Grid>
</section>

<!-- ── About PriceCharting ────────────────────────────────────── -->
<section class="page-section" aria-label="About PriceCharting">
    <Grid>
        <Row>
            <Column lg={8} md={4} sm={4}>
                <Tile>
                    <p class="about-heading">What is PriceCharting.com?</p>
                    <p style="font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.6;">
                        PriceCharting is a free, community-driven price guide that tracks
                        real sale prices for video games, consoles, and trading cards —
                        including every Pokémon TCG set. It aggregates completed sales from
                        eBay and other marketplaces to give you up-to-date market values
                        for Ungraded, PSA&nbsp;9, and PSA&nbsp;10 cards.
                    </p>
                    <a
                        class="about-link"
                        href="https://www.pricecharting.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >Visit PriceCharting.com ↗</a>
                </Tile>
            </Column>
            <Column lg={8} md={4} sm={4}>
                <Tile>
                    <p class="about-heading">Why use this scraper?</p>
                    <ul class="feature-list">
                        <li>Export an entire set's prices to CSV with one click</li>
                        <li>Track collection value across Ungraded, PSA 9, and PSA 10 grades</li>
                        <li>Compare sets side-by-side in Excel or Google Sheets</li>
                        <li>No account or API key needed</li>
                    </ul>
                </Tile>
            </Column>
        </Row>
    </Grid>
</section>

<!-- ── How It Works ──────────────────────────────────────────── -->
<section class="page-section" aria-label="How it works">
    <Grid>
        <Row>
            <Column>
                <span class="section-label">How it works</span>
            </Column>
        </Row>
        <Row>
            {#each steps as step}
                <Column lg={5} md={3} sm={4}>
                    <Tile>
                        <div class="step-number">{step.number}</div>
                        <p class="step-heading">{step.heading}</p>
                        <p class="step-desc">{step.desc}</p>
                    </Tile>
                </Column>
            {/each}
        </Row>
    </Grid>
</section>

<!-- ── Quick Start Sets ──────────────────────────────────────── -->
<section class="page-section" aria-label="Quick start sets">
    <Grid>
        <Row>
            <Column>
                <span class="section-label">Quick Start</span>
                <h2 class="section-heading">Popular sets to try</h2>
                <div class="tile-grid">
                    {#each exampleSets as set}
                        <ClickableTile
                            class="set-tile"
                            on:click={(e) => { e.preventDefault(); scrapeSet(set.name); }}
                        >
                            <span class="era-badge">{set.era}</span>
                            <p class="set-name">{set.name}</p>
                            <p class="set-desc">{set.description}</p>
                        </ClickableTile>
                    {/each}
                </div>
            </Column>
        </Row>
    </Grid>
</section>

<!-- ── Popular Sets ──────────────────────────────────────────── -->
{#if topSets.length > 0}
    <section class="page-section" aria-label="Popular sets from PriceCharting">
        <Grid>
            <Row>
                <Column>
                    <span class="section-label">From PriceCharting</span>
                    <h2 class="section-heading">Popular Sets</h2>
                    <p class="section-subtext">
                        Live data from PriceCharting — click any set to scrape it immediately.
                    </p>
                    <Tile>
                        <div class="tag-grid">
                            {#each topSets as set}
                                <Tag
                                    interactive
                                    type="blue"
                                    on:click={() => scrapeSet(set.replaceAll(" ", "-"))}
                                >{set.replaceAll(" ", "-")}</Tag>
                            {/each}
                        </div>
                    </Tile>
                </Column>
            </Row>
        </Grid>
    </section>
{/if}

<style>
    /* ── Status bar ───────────────────────────────────────── */
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
        border-bottom: 1px solid var(--border-color, #e0e0e0);
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
