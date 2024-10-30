<script lang="ts">
    import { onMount } from "svelte";

    import * as Card from "$lib/components/ui/card";
    import * as Alert from "$lib/components/ui/alert";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import { CircleAlert } from 'lucide-svelte';

    let running = false;
    let toScrape = "";
    let topSets: string[] = [];
    
    function outputAsDownload(csvText: string)
    {
        // const text = output.join("\n");
        const blob = new Blob([csvText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        a.download = `${toScrape ? toScrape : "pokemon-base-set"}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click(); // Simulate a click to trigger the download
        console.log("Dumped CSV")
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    async function runScraper()
    {
        if(!running)
        {
            running = true;
            await fetch(`${window.location.origin}/scrape?set-name=${toScrape}`, {
                method: "GET",
                headers: {
                    "Content-Type": "text/plain",
                    "Connection": "keep-alive",
                },
            })
            .then(response => response.json())
            .then(data => {
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

    async function getPopularSets()
    {
        let setUrl = "https://www.pricecharting.com/consoles-autocomplete/pokemon-cards"
        await fetch(setUrl, {
            method: "GET",
            headers: {
                "Content-Type": "text/plain",
                "Connection": "keep-alive",
            },
        })
        .then(response => response.json())
        .then(data => {
            data.forEach((element : any) => {
                if(element?.label && element.label != "all" && topSets.length < 20)
                {
                    topSets = [...topSets, element.label];
                }
            });
        });
        console.log(topSets);
    }

    onMount(() => {
        hardcodedUrl = `${window.location.origin}/healthcheck`
        checkEndpoint();
        getPopularSets();
        
    });

    const loadingCircle = `<div role="status">
    <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
    </svg>
    <span class="sr-only">Loading...</span>
</div>`;

    let showCard = true;

    function closeCard() {
        showCard = false;
    }
</script>


<main>
    <div class="grid justify-center">
        <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-3">Scrape </h1>
        <p class="leading-7 [&:not(:first-child)]:mt-3"> Scrape pricecharting with a given card set.</p>
        
        <span class="flex">
            <Input class="mr-5 border-2 border-black" bind:value={toScrape}/>
            <Button id="scraper-button" on:click={()=>{console.log(toScrape);runScraper();}}>
                {#if running}
                {@html loadingCircle}
                {:else}
                {"Scrape"}
                {/if}
            </Button>
        </span>
        <h2 class="text-3xl tracking-tight lg:text-3xl mt-3">Example sets to scrape (Click to scrape) </h2>
        <span>
            <Button on:click={()=>{toScrape = "pokemon-lost-origin";document.getElementById("scraper-button")?.click()}}>
                pokemon-base-set
            </Button>
            <Button on:click={()=>{toScrape = "pokemon-lost-origin";document.getElementById("scraper-button")?.click()}}>
                pokemon-lost-origin
            </Button>
            <Button on:click={()=>{toScrape = "pokemon-evolving-skies";document.getElementById("scraper-button")?.click()}}>
                pokemon-evolving-skies
            </Button>
            <Button on:click={()=>{toScrape = "pokemon-celestial-storm";document.getElementById("scraper-button")?.click()}}>
                pokemon-celestial-storm
            </Button>
            
        <h2 class="text-3xl tracking-tight lg:text-3xl mt-3">Popular sets (Untested!)</h2>
        <span>
            {#each topSets as set}
                <Button class="m-0.5" on:click={()=>{toScrape = set.replaceAll(" ", "-");document.getElementById("scraper-button")?.click()}}>
                    {set.replaceAll(" ", "-")}
                </Button>
            {/each}
        </span>
    </div>

    <footer class="fixed bottom-0 right-0">
        {#if showCard}
            <Card.Root class="w-full max-w-md mx-auto">
                <Card.Header>
                    <span class="flex">
                        <Card.Title class="mt-3">Backend Endpoint Status Display</Card.Title>
                        <Button on:click={closeCard} class="ml-auto">Close</Button>
                    </span>
                </Card.Header>
                <Card.Content>
                    <div class="space-y-4">
                        <p class="text-sm text-muted-foreground">Checking status for: {hardcodedUrl}</p>
                        {#if endPointLoad}
                            <p class="text-sm text-muted-foreground">Checking status...</p>
                        {:else if status === "success"}
                            <Alert.Root variant="default" class="bg-green-100 border-green-200">
                                <CircleAlert class="h-4 w-4 text-green-600" />
                                <Alert.Description class="text-green-800">Endpoint is up and running!</Alert.Description>
                            </Alert.Root>
                        {:else if status === "error"}
                            <Alert.Root variant="destructive">
                                <CircleAlert class="h-4 w-4" />
                                <Alert.Description>Failed to connect to the endpoint.</Alert.Description>
                            </Alert.Root>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>
        {/if}
    </footer>
</main>