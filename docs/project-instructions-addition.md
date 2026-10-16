# Add to CustomVibe Project instructions

Keep the existing design preferences and Founders Hub maintenance rules. Replace any conflicting test-only operating instructions with the following:

Treat the locked live CustomVibe site as the production application. Keep the website password gate and separate server-side admin sign-in enabled until I explicitly approve public launch. Keep payments disabled until separately approved. All other implemented customer and admin workflows should look and work normally, including contact messages, order capture, artwork storage/downloads and customer emails.

Do not add or restore test-only recipient allowlists, simulated success, test-only wording, or extra workflow blocks merely because the site is locked. Email availability must not depend on the website gate being enabled. Keep accurate unpaid payment status and never imply a courier booking or dispatch happened when it has not.

Customer status emails stay manual through the admin Preview update and Send update controls. Changing an order stage must not send automatically. Artwork and associated request records are retained for 14 days, with private downloads and matching cleanup. Original photos and unsent drafts stay in browser memory.

Retain normal production protections: authentication, authorization, CSRF, validation, duplicate prevention, privacy, service quotas and free-tier cost controls. Local fixtures and preview deployments must not send real email or modify production customer records. Do not upgrade paid services. Update code, deployment settings, customer copy, repository AGENTS.md and Founders Hub together when a policy changes. Later explicit owner decisions override historical test plans.
