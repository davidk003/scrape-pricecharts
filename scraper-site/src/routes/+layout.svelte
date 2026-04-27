<script>
  import "carbon-components-svelte/css/g10.css";
  import "../app.css";
  import {
    Header,
    Content,
    SkipToContent,
    HeaderNav,
    HeaderNavItem,
  } from "carbon-components-svelte";
</script>

<Header platformName="PriceCharts Scraper">
  <svelte:fragment slot="skipToContent">
    <SkipToContent />
  </svelte:fragment>
  <svelte:fragment slot="nav">
    <HeaderNav>
      <HeaderNavItem
        href="https://www.pricecharting.com"
        target="_blank"
        rel="noopener noreferrer"
        text="PriceCharting.com ↗"
      />
    </HeaderNav>
  </svelte:fragment>
</Header>

<Content>
  <slot />
</Content>

<footer class="site-footer">
  <span>
    Data sourced from
    <a
      href="https://www.pricecharting.com"
      target="_blank"
      rel="noopener noreferrer"
      class="footer-link"
    >PriceCharting.com</a>
  </span>
  <span>Built with SvelteKit</span>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--border-color, #e0e0e0);
    padding: 1.25rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8125rem;
    color: var(--text-secondary, #525252);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .footer-link {
    color: var(--accent, #0062ff);
    text-decoration: none;
  }

  .footer-link:hover {
    text-decoration: underline;
  }
</style>
