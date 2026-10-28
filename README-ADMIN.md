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
