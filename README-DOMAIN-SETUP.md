# Search engine setup — current Netlify domain

Current canonical website URL: https://melodious-concha-88f352.netlify.app

After deploying this package, check:
- https://melodious-concha-88f352.netlify.app/robots.txt
- https://melodious-concha-88f352.netlify.app/sitemap.xml

Google Search Console: https://search.google.com/search-console
Add a URL-prefix property for https://melodious-concha-88f352.netlify.app/ and verify ownership using the recommended HTML file or HTML meta tag. If using HTML file, add the exact file Google provides to the website root and redeploy; if using a meta tag, place the exact verification tag inside the homepage <head> and redeploy. Then submit sitemap.xml under Sitemaps.

Bing Webmaster Tools: https://www.bing.com/webmasters
Import the verified Search Console property or verify the URL and submit sitemap.xml.

This is a temporary Netlify domain. When you get a custom domain, regenerate sitemap and canonicals with SITE_URL=https://your-new-domain python3 scripts/build-seo.py and update Search Console/Bing.

The admin app requires separate Supabase and Netlify Functions setup per README-ADMIN.md. This package does not itself connect or verify either search engine account.
