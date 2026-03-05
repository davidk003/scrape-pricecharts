<script>
  import "carbon-components-svelte/css/g10.css";
  import "../app.css";
  import {
    Header,
    Content,
    SkipToContent,
  } from "carbon-components-svelte";
</script>

<Header platformName="PriceCharting Scraper">
  <svelte:fragment slot="skipToContent">
    <SkipToContent />
  </svelte:fragment>
</Header>

<Content>
  <slot></slot>
</Content>
