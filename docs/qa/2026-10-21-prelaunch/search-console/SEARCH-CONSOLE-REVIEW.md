# CustomVibe Search Console review

21 October 2026. Signed-in frontend review of `sc-domain:customvibe.co.za` in the existing business account. This records the available reports and their limits, not a launch approval or an indexing guarantee. Account recovery and renewals were excluded. Property-role labels were observed without retaining private identities; no access, verification, AI preference, export, site-move or crawl setting was changed.

## Results

| Section | Actual observation | Interpretation and follow-up |
| --- | --- | --- |
| Overview, Performance and Insights | Three-month selector; available chart 14 to 19 October. 12 clicks, 60 impressions, 20% CTR, average position 10.4; last update shown five hours earlier. Only reported page is the homepage; all country traffic is South Africa. Desktop 10 clicks/48 impressions; mobile 2/12. The disclosed query `custom vibe` has 10 clicks/56 impressions. Search appearance has no data. Insights repeats the same totals for its 28-day view. | Small historical sample, not proof of current shopping access, customers, conversions or comprehensive query coverage. No marketing/analytics service is needed to complete this review. |
| Page indexing | Processing data, check again later; no reasons or totals supplied. | A report availability limit, not evidence of zero indexed pages. Aggregate exclusions, duplicate URLs and site-wide canonical coverage remain unverified. |
| Stored homepage URL inspection | URL is on Google; indexed though blocked by robots.txt. Stored last-crawl label 21 October 2026, 7:35:18 AM, Googlebot smartphone; crawl blocked, fetch failed due to robots; indexing allowed shown Yes; user canonical None; selected canonical inspected URL. Sitemap discovery shows temporary processing error. | The homepage URL remains known/indexed despite blocked crawling. This does not show protected shop or customer content. Current noindex response cannot be assumed read by a crawler blocked by robots. Do not remove the gate or permit crawling to clear a warning. Recheck after separately approved launch; no live test, indexing or removal request was made. |
| Sitemaps | Existing submission `https://customvibe.co.za/sitemap.xml`, submitted 15 October, Unknown/Couldn't fetch, zero pages/videos. Detail shows last read 15 October and one general HTTP error, with no numeric status supplied. | Fresh anonymous check below finds 401, consistent with the active gate. That current response is not a reconstruction of Google's historical HTTP exchange. Reuse the existing deferred post-launch sitemap task. |
| Removals | Temporary removals, outdated content and SafeSearch filtering each show no requests in the last six months. | No new removal requested. |
| Core Web Vitals | Last updated 20 October; mobile and desktop reports unavailable because there is insufficient usage in the last 90 days. | No field CWV pass, failure or score can be inferred. Existing runtime/phone checks and eventual field-data review stay separate. |
| HTTPS | Updated 21 October; one HTTPS URL, zero non-HTTPS URLs; no detected issues in the last 90 days. | Positive for the reported URL, not a complete TLS/device assessment. |
| Enhancements/video/product reports | Overview says no enhancements yet; no additional enhancement or video-indexing report was exposed in navigation. | Unavailable reports explicitly recorded; no structured-data validation pass inferred. |
| Security and manual actions | Both actual reports say no issues detected. | Search Console observation only, not a full security audit. |
| Links | External and internal link totals zero, all detail categories no data. | Reported absence does not mean the website has no internal links. |
| Settings, robots and crawl stats | Property added 15 October; verified-owner banner and Owner Verified property role observed. Robots report lists HTTP and HTTPS files fetched 15 October, 26 bytes, no listed issues. Crawl report updated 20 October: eight requests, 254K bytes, average 120 ms; 75% 401/407, 25% 301; all reported requests AdsBot and refresh; no host problems reported for 90 days. | Very small bot-specific sample; not user performance, LCP, uptime proof, booking or evidence of an active ad campaign. Original Google verification retained. |
| Associations, export, site move and AI setting | No associated services or pending requests. Bulk export is unconfigured setup. Address-change page is unconfigured setup. Search generative AI is at its existing default Include. | No Analytics, BigQuery or other service was connected, and no preference or migration was changed. Account recovery, MFA, registrar and renewals were not reviewed. |
| Messages and achievements | Two general setup/traffic notices dated 15 and 18 October, no specific new incident notice. Opening the unread notice marked it read through the normal frontend. Achievements is gathering data and asks to check again in about 24 days. | No setup suggestion was applied. Achievements availability is not a website fault or a scheduled automation request. |

## Fresh anonymous evidence

At 16:09 UTC, three ordinary public GETs without authentication returned:

- `/robots.txt`: 200, `User-agent: *` and `Disallow: /`, no-store.
- `/sitemap.xml`: 401, HTML coming-soon/sign-in response, `X-Robots-Tag: noindex, nofollow, noarchive`, private/no-store.
- `/`: the same 401/noindex/private protection pattern.

The protected production state is working as instructed. Evidence: `anonymous-crawl-observations.json`; dated frontend captures `01-` through `22-` retained locally in `audit/fix-plan/github-wait-execution-20261021/search-console/`. Stored inspection screenshot: `audit/screenshots/SC-review-homepage-indexed-robots-blocked.png`. No customer records, private pages, cookies, credentials or verification tokens were copied.

## Priorities and task disposition

1. Preserve current gate, Admin sign-in and disabled payments. The observed homepage index entry does not authorize launch or an automatic removal request.
2. Keep **Verify sitemap fetching after approved public launch** Deferred. Its existing scope should cover anonymous sitemap success, valid XML, intended public URLs, robots/canonicals and stored/live Google inspection after launch approval. Review aggregate indexing and CWV when Google has actual data. No new duplicate task or scheduled automation is needed.
3. Record the current reporting review in **Review Google Search Console in full**. Its required post-launch subtask remains open, so the parent must remain In progress even when current-review checklist items are checked.
4. Phone, print and Gmail acceptance remain in their existing tasks; none is closed by this report.

## Primary documentation

- [Google Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en): fetch failures and login restrictions require distinguishing submission from successful retrieval. A blocked sitemap should be retested after the intended access change, not exposed prematurely.
- [Google Page indexing report](https://support.google.com/webmasters/answer/7440203?hl=en#indexed_though_blocked_by_robots_txt): robots restrictions can coexist with an indexed URL, and intentional exclusions need context before correction.

Both checked 21 October 2026. No quotation, full-report reproduction or general access-control conclusion is intended.
