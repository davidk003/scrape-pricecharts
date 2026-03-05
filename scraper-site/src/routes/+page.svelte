<script lang="ts">
    import { onMount } from "svelte";
    import {
        Button,
        TextInput,
        Tile,
        InlineNotification,
        InlineLoading,
        Tag,
    } from "carbon-components-svelte";

    let running = false;
    let toScrape = "";
    let topSets: string[] = [];

    function outputAsDownload(csvText: string) {
        const blob = new Blob([csvText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${toScrape ? toScrape : "pokemon-base-set"}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        console.log("Dumped CSV");
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    async function runScraper() {
        if (!running) {
            running = true;
            await fetch(`${window.location.origin}/scrape?set-name=${toScrape}`, {
                method: "GET",
                headers: {
                    "Content-Type": "text/plain",
                    Connection: "keep-alive",
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    outputAsDownload(data);
                    running = false;
                });
        }
    }

    let status = "";
    let endPointLoad = true;
    let hardcodedUrl = "";

    async function checkEndpoint() {
        try {
            const response = await fetch(hardcodedUrl);
            status = response.ok ? "success" : "error";
        } catch (error) {
            status = "error";
        } finally {
            endPointLoad = false;
        }
    }

    async function getPopularSets() {
        let setUrl = "https://www.pricecharting.com/consoles-autocomplete/pokemon-cards";
        await fetch(setUrl, {
            method: "GET",
            headers: {
                "Content-Type": "text/plain",
                Connection: "keep-alive",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                data.forEach((element: any) => {
                    if (element?.label && element.label != "all" && topSets.length < 20) {
                        topSets = [...topSets, element.label];
                    }
                });
            });
        console.log(topSets);
    }

    onMount(() => {
        hardcodedUrl = `${window.location.origin}/healthcheck`;
        checkEndpoint();
        getPopularSets();
    });

    let showCard = true;

    function closeCard() {
        showCard = false;
    }

    function scrapeSet(setName: string) {
        toScrape = setName;
        runScraper();
    }
</script>

<main style="padding: 2rem; max-width: 960px; margin: 0 auto;">
    <h1 style="margin-bottom: 0.25rem;">Scrape</h1>
    <p style="margin-bottom: 1.5rem;">Scrape pricecharting with a given card set.</p>

    <div style="display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 2rem;">
        <div style="flex: 1;">
            <TextInput
                labelText="Card set name"
                placeholder="e.g. pokemon-base-set"
                bind:value={toScrape}
            />
        </div>
        <div>
            {#if running}
                <InlineLoading description="Scraping..." />
            {:else}
                <Button on:click={() => runScraper()}>Scrape</Button>
            {/if}
        </div>
    </div>

    <h2 style="margin-bottom: 0.75rem;">Example sets to scrape (Click to scrape)</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem;">
        <Tag
            interactive
            type="blue"
            on:click={() => scrapeSet("pokemon-base-set")}
        >pokemon-base-set</Tag>
        <Tag
            interactive
            type="blue"
            on:click={() => scrapeSet("pokemon-lost-origin")}
        >pokemon-lost-origin</Tag>
        <Tag
            interactive
            type="blue"
            on:click={() => scrapeSet("pokemon-evolving-skies")}
        >pokemon-evolving-skies</Tag>
        <Tag
            interactive
            type="blue"
            on:click={() => scrapeSet("pokemon-celestial-storm")}
        >pokemon-celestial-storm</Tag>
    </div>

    <h2 style="margin-bottom: 0.75rem;">Popular sets (Untested!)</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem;">
        {#each topSets as set}
            <Tag
                interactive
                type="teal"
                on:click={() => scrapeSet(set.replaceAll(" ", "-"))}
            >{set.replaceAll(" ", "-")}</Tag>
        {/each}
    </div>

    {#if showCard}
        <div style="position: fixed; bottom: 1rem; right: 1rem; width: 400px;">
            <Tile>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4>Backend Endpoint Status Display</h4>
                    <Button kind="ghost" size="small" on:click={closeCard}>Close</Button>
                </div>
                <p style="font-size: 0.875rem; color: var(--cds-text-secondary, #525252); margin-bottom: 0.75rem;">
                    Checking status for: {hardcodedUrl}
                </p>
                {#if endPointLoad}
                    <InlineLoading description="Checking status..." />
                {:else if status === "success"}
                    <InlineNotification
                        kind="success"
                        title="Status:"
                        subtitle="Endpoint is up and running!"
                        hideCloseButton
                    />
                {:else if status === "error"}
                    <InlineNotification
                        kind="error"
                        title="Error:"
                        subtitle="Failed to connect to the endpoint."
                        hideCloseButton
                    />
                {/if}
            </Tile>
        </div>
    {/if}
</main>
