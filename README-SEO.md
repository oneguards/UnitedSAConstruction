# United SA Construction V26 — Search Engine Setup

This update adds a private SEO setup guide at `/admin/seo.html`, a robots.txt file, and a domain-aware sitemap/canonical generator. It preserves the V25 website and backend starter.

**Before publishing:** Confirm the real production domain, then run:

```bash
SITE_URL=https://YOUR-ACTUAL-DOMAIN.com python3 scripts/build-seo.py
```

The command writes `sitemap.xml`, updates `robots.txt`, and adds canonical URLs to the six public pages. Run this before your Netlify CLI/Git deploy. Do not publish the example domain.

Then verify site ownership in Google Search Console and Bing Webmaster Tools and submit the public sitemap URL. Google Business Profile should also link to the same domain.

This is not an OAuth/API integration with search engines, and indexing/rankings are not guaranteed. SEO admin page is a setup guide, not a live Search Console dashboard. Do not use the public website's indexable pages to store admin secrets.
