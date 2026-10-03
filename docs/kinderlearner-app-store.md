# KinderLearner App Store handoff

Prepared September 26, 2026. Website changes are local only; nothing was submitted to Apple or deployed by this task.

## Owner-supplied replacement policy

The privacy page now renders the owner's 21-section replacement policy, effective September 26, 2026, in `shared/KinderLearnerPrivacy.tsx`. The owner confirmed **Big Apple Digital LLC** as the legal operator and **Cloudflare** for email delivery. The Terms page operator was aligned. The owner selected `hello@bigappledigital.nyc` as the contact; address and telephone placeholders were omitted, not invented. Review whether additional operator-contact disclosures are required before publication.

The owner subsequently confirmed no use of children's learning records for generative-AI training, the 24-month inactivity policy, recovery copies expiring within seven days, and no Google Analytics in the app. These now appear as definitive policy text, without editorial notes. Website-only Google Analytics disclosure is retained, with plain browser-storage controls language; no unverified consent banner or opt-in mechanism is claimed. Review website consent requirements separately before release. The policy's authorization notices, sync controls and retention commitments must match the released native app and operational practices. This text replacement does not implement or independently audit those features. Internal policy/deletion links use the existing canonical paths instead of production-URL placeholders.

## URLs to use after website deployment

| App Store field / purpose | URL |
| --- | --- |
| Marketing URL | https://nycschoolsratings.com/kinderlearner |
| Support URL | https://nycschoolsratings.com/kinderlearner/support |
| Privacy Policy URL | https://nycschoolsratings.com/kinderlearner/privacy |
| Privacy Choices URL (optional) | https://nycschoolsratings.com/kinderlearner/delete-data |
| Terms of Use | https://nycschoolsratings.com/kinderlearner/terms |

All pages are public routes without sign-in, fully server-rendered, have canonical URLs, and are listed in the static sitemap. Terms link to Apple's Standard EULA; these website terms are not a custom EULA submitted to Apple. No store badge or fabricated App Store link was added.

## App evidence reviewed

Private repository `biserd/KinderQuest`, main at `fccffd6e80fa3a82998c8587bdb547c4722478f2`, read in authenticated GitHub UI. The CLI's existing token is invalid, so no clone or repository mutation was performed.

- [Root README](https://github.com/biserd/KinderQuest/blob/fccffd6e80fa3a82998c8587bdb547c4722478f2/README.md): iOS/iPadOS 18+, local SwiftData guest play, optional sync, native account deletion, bundled narration, no third-party native SDKs or real-money purchases. Phonics/blending and new executive-function games are future work.
- [Backend README](https://github.com/biserd/KinderQuest/blob/fccffd6e80fa3a82998c8587bdb547c4722478f2/backend/README.md): account flows, sync, limits and retention caveats.
- [Backend index](https://github.com/biserd/KinderQuest/blob/fccffd6e80fa3a82998c8587bdb547c4722478f2/backend/src/index.ts): existing privacy/support policy, operator Biser Mitkov Dimitrov, contact `hello@bigappledigital.nyc`, authenticated family storage, daily expiry cleanup, log redaction.
- [Authentication](https://github.com/biserd/KinderQuest/blob/fccffd6e80fa3a82998c8587bdb547c4722478f2/backend/src/auth.ts): hashed 10-minute email codes, five guesses, signed bearer sessions, deletion enabled and fresh-session requirement, Cloudflare email delivery and rate limits.

The new website pages distinguish app data from marketing-site Google Analytics/attribution and from the separate school-research account. They do not falsely claim the app collects no data. Native runtime behavior and the submitted binary were not tested on an Apple device in this task.

## Required owner/release checks before submission

1. Review the policy and terms for accuracy and obtain appropriate legal review, particularly children's privacy, parent authorization/consent, operator contact disclosures, international availability and consumer rights. An arithmetic parent gate or an email code alone must not be represented as a certification of COPPA compliance.
2. Confirm the operator identity and support mailbox in the app remain correct and monitored. The new pages intentionally reuse the app's existing `hello@bigappledigital.nyc` rather than silently changing its support destination.
3. The owner confirmed the seven-day Cloudflare recovery window and 24-month inactivity policy. Verify the deployed configuration and processes match these commitments at release; independently review operational-log and support-email retention. This website edit changes no database settings or deletion jobs.
4. Review App Store Connect App Privacy against the exact submitted binary and server. Assess parent email, account/user identifiers, child nicknames and avatars, learning answers/history/progress, security IP/request data and purposes/linkage. Do not select "Data Not Collected" solely because guest mode is local. No answers were submitted in this task.
5. Test guest mode, explicit guest-to-cloud authorization, sign-in, restore, sync, sign-out and account deletion on iPhone and iPad. Verify server deletion and session revocation; confirm the documented limitations for offline copies and backups. Do not test with real child information.
6. The app currently links to its account Worker `/privacy` and `/support`. After these new site pages are published and verified, update the app's policy/support URLs and either redirect or keep the old Worker pages synchronized. This task does not edit the app repo or remove its existing policy routes.
7. Review Kids Category requirements, parental gates for external links/purchases, age-rating answers and consent requirements for every intended region. The adult marketing website uses analytics; do not embed it as an ungated child-facing app experience.
8. Keep Apple’s Standard EULA unless a reviewed custom license is intentionally chosen. A separate custom EULA is not automatically required just because a Terms page exists.
9. Validate all final HTTPS URLs without authentication from a clean browser, including inside the app, and verify that no staging expiry or access challenge blocks reviewers.
10. Supply accurate app screenshots, icon, description, review notes and any reviewer access required by the actual build. Do not advertise phonics/blending or future executive-function games as shipped capabilities. The landing pages now flag current versus planned features.

## Apple references checked

- [App Review: support and privacy links](https://developer.apple.com/app-store/review/)
- [App Review Guidelines: Kids Category and privacy](https://developer.apple.com/app-store/review/guidelines/)
- [App Privacy details](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Account deletion inside apps](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)

These pages and this checklist prepare submission materials; they do not establish legal compliance or guarantee App Review approval.
