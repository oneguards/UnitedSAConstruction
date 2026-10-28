# United SA Construction — website administration

The dashboard manages customer leads, services, projects, social and Google links, licenses, and brands. Public pages read the same published database records that administrators edit.

## Existing project rollout

1. `supabase/connect-existing-content.sql` adds the Brands table, service card visibility, and link placement. This schema change has already been applied to the existing project; do not rerun it.
2. `supabase/project-photos.sql` adds project photo arrays, completion dates, and the public project-photo bucket. This additive change has also been applied to the existing project; do not rerun it.
3. Merge/deploy the connected content renderer and API through the existing GitHub/Netlify integration.
4. Run `supabase/import-existing-content.sql` to import the original eight services (six cards plus two estimate-only choices), six projects, one license, three links, and four brands. The import uses stable IDs and does not overwrite later edits when rerun.
5. Refresh `/admin/` and verify the existing records in each tab. Edit, publish/unpublish, and reorder them as needed. Updates appear on the next public page load.

The original public content snapshot is in `supabase/existing-content.json`. The import is explicit and never runs automatically at deploy time.

## New empty database only

Run `supabase/schema.sql` once, then the content import. Enable the owner's existing Auth account by adding its UUID to `admin_users` only after the owner approves that account. Disable public signups in Supabase Authentication settings.

## Access and deployment

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the existing Netlify project. The server credential must be secret, available to Functions in Production, and never put into client files or GitHub. Redeploy after changing values. `admin/config.js` contains only the public URL and publishable key.

RLS is enabled on all content tables, `leads`, and `admin_users`. Browser roles have no direct table privileges; the Netlify function verifies each session and checks `admin_users` for every private request. Only published content is returned by the public endpoints. Anonymous lead submission is server-side. Authentication alone does not grant administrator access.

## Content behavior

- Services: edit name, description, image, order, visibility, and whether the service has a card. Published services populate the estimate dropdown and footer; service cards appear on Home and Services.
- Projects: edit the description and completion date, upload up to 30 photos, reorder by selecting a cover, or add HTTPS image links. Direct uploads support JPG, PNG, WebP, and AVIF up to 10 MB per file. Images upload to the public `project-photos` bucket using a server-issued signed upload token, available only after session and administrator authorization. No direct Storage write policy is granted to browser roles. Public portfolio images are readable by anyone with their URL. Removing a photo from a project removes its website reference; it does not permanently delete the Storage file. Avoid uploading private documents as portfolio photos.
- Links: choose Facebook, Google Maps, Google Reviews, or Custom placement. Google Maps updates the contact link; Google Reviews updates the review links throughout the site. All published links appear in the footer.
- Licenses: updates apply to the footer, About, and Contact licensing sections. Clearing an expiration date is supported. Verify credentials before changing public claims.
- Brands: edit the name, product description, optional logo image URL, optional website link, visibility, and order on Home and Services. Manufacturer certification is not implied.
- If the content API is unavailable, the original static content remains as a fallback. A successful empty response clears the section, so unpublishing all records is respected.
- Leads are stored in Supabase; email/SMS notifications are not configured.

## Verification

Run `npm ci && npm test`. Tests cover existing content counts, edits, shared links, empty published collections, outage fallback, dashboard editors for all five content collections, and administrator authorization on brand writes. The tests use simulated transport and sessions; a real administrator should also verify editing in the deployed dashboard.

## Dashboard design

The dashboard has a responsive sidebar, mobile section navigation, searchable/filterable records, collection summaries, and a focused editing drawer. The sign-in screen supports password visibility and inline errors. All editing fields have labels; focus indicators, reduced motion, and native modal keyboard behavior are supported.

## Public portfolio

The homepage features the latest published project with completion dates first (newest date first). If no projects have dates, it uses the latest created record, with display order as a tie-breaker. Its cover, title, and description link to the project viewer; arrows and swipes browse additional photos.

Our Work displays every published project as a card. The cover, title, description, and View project link all open a shareable `/our-work#project=ID` viewer. Desktop shows a contained large image, thumbnail chooser, and project details in one screen. Mobile uses a swipeable image track, horizontal thumbnails, and vertically scrollable details. Escape/Close and browser Back return to the gallery. Projects without photos or completion dates are supported.

### Homepage promotions

Open **Promotions → Add promotion**. Enter a headline and message, choose **Homepage top banner**, **Homepage popup**, or **Banner and popup**, and optionally add button text plus a complete HTTPS link (for example `https://unitedsaconstruction.com/contact#estimate`). Save it as a draft or enable **Promotion turned on**. Cards also have quick **Turn on / Turn off** buttons. Changes appear on the next homepage load without redeploying.

New offers default off. If several are on, the offer with the lowest display order wins (ties: newest created, then ID). One campaign appears at a time. Popups wait briefly and avoid interrupting an active form or dialog. Close/Escape dismisses them; each popup is shown once per browser tab session. Editing its copy or placement resets dismissal. The banner can be dismissed separately. No offers are shown on API failure. Only the homepage loads promotions.

`supabase/promotions.sql` adds the service-only, RLS-protected table; the backend only returns published promotions publicly. No promotion content is seeded or activated. Merge/deploy the current PR before using this section.

### Website reports

**Reports** shows 7/30/90-day visits, page views, inquiries, a daily chart/table, popular pages, top 20 referral domains, and Mobile/Tablet/Desktop views. Dates use America/New_York, including daylight saving time; today is partial. Refresh or change the range to update. Form inquiries are counted independently, including any test or spam submissions; they are not attributed conversions.

Traffic collection starts after deployment, without importing historical Netlify data. `assets/analytics.js` is loaded only on the six public pages and only sends on the custom production domain. Admin pages and Netlify previews are excluded, as are browsers with an existing Supabase login token, Do Not Track, or Global Privacy Control. Each page load is a view; project photo changes are not extra page views. Visits use a random ID in sessionStorage, reset after 30 minutes between page loads; separate tabs/devices can count separately. No cookies, raw IPs, full referral URLs/query strings, or user-agent strings are saved in the reporting table. There is no cross-device person identification. When storage is blocked, sessions may be overcounted; blockers may undercount traffic.

The public ingestion route accepts only known page paths, validated UUIDs, coarse device types, and a referral hostname. It checks the production Origin, ignores common bots/privacy headers, and deduplicates repeated event IDs. This is approximate browser analytics: Origin headers and IDs can be forged by non-browser clients, so this is not a fraud-resistant visitor counter. Each page view consumes a Netlify function request and a database insert. No third-party analytics service is added. Network/hosting logs are governed separately by Netlify and Supabase.

`supabase/reports.sql` configures the RLS-protected event table and a service-only, security-invoker aggregate function. Reports require the same verified admin authorization as content editing. No direct browser reads/writes are granted. Report windows cover up to 90 days; event rows currently remain stored beyond that (no automatic deletion job). The reporting feature and data collection begin only when this PR is merged/deployed.
