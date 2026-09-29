# Family Premium checkout funnel

The primary paid CTA opens Stripe Checkout without requiring an account. An optional account-first link on `/pricing` uses `/register?plan=family_premium`; after registration (or password sign-in from that form), `/pricing?checkout=continue` verifies the signed-in account's access and opens Checkout once. Ordinary `/register` remains a free sign-up that goes to the homepage.

## Funnel signals

| Stage | Source | Signal |
| --- | --- | --- |
| Paid CTA clicked | Google Analytics | `subscription_cta_click` |
| Account-first path selected | Google Analytics | `subscription_signup_started` |
| Account created with paid intent | Google Analytics and Cloudflare Workers Logs | `sign_up` with `plan_intent=family_premium`, `subscription_signup_completed`, and `family_premium_signup_completed` respectively |
| Registration continued to checkout | Google Analytics | `subscription_signup_to_checkout` |
| Checkout session created or blocked | Cloudflare Workers Logs | `family_checkout_session_created`, `family_checkout_blocked`, `family_checkout_failed` with `channel=guest` or `account` |
| Checkout session created in browser | Google Analytics | `checkout_session_created` and `begin_checkout` |
| Hosted checkout loaded, payment attempted, completed | Stripe Dashboard | Checkout Performance, filtered to **NYC School Ratings — Family Premium** |
| Browser returned from Stripe | Google Analytics | `subscription_checkout_returned` with `result=canceled` or `success_return` |
| Paid access granted | Stripe signed webhook and application subscription record | Confirm `family_subscriptions` status; a success URL alone is not proof of payment |

Client analytics may be blocked by browser settings or lost during navigation. Workers Logs and Stripe Checkout Performance are independent diagnostic sources. A successful Worker invocation does not necessarily mean the route returned HTTP 2xx. The structured checkout logs contain no email, user ID, customer ID, or Checkout URL.
