// Only the App Store bundle claims this one route. Browser sign-in and checkout
// emails continue to use the existing web callback.
export const appSignInPath = "/auth/ios/sign-in";
const productionOrigin = "https://nycschoolsratings.com";
const associationPath = "/.well-known/apple-app-site-association";

export function signInEmailUrl(base: string, token: string, returnTo: string, client: unknown): string {
  if (client === "ios" && base === productionOrigin) {
    // A fragment reaches the app (or browser) but not HTTP access logs or previews.
    return productionOrigin + appSignInPath + "#" + token;
  }
  return base + "/auth/magic-link/callback?token=" + token + "&returnTo=" + encodeURIComponent(returnTo);
}

export function iosSignInResource(request: Request): Response | undefined {
  const { origin, pathname } = new URL(request.url);
  if (origin !== productionOrigin || (pathname !== associationPath && pathname !== appSignInPath)) return;
  if (request.method !== "HEAD" && request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const head = request.method === "HEAD";
  if (pathname === associationPath) {
    return new Response(head ? null : JSON.stringify({
      applinks: { details: [{ appIDs: ["DB5JRGGB6A.com.nycschoolsratings.ios"], components: [{ "/": appSignInPath }] }] },
    }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
  }

  // Standalone page: no analytics, third-party assets, or redemption on load.
  const nonce = crypto.randomUUID();
  return new Response(head ? null : `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in | NYC Schools Ratings</title>
<style nonce="${nonce}">body{font:1.1rem/1.55 system-ui;color:#16293f;margin:12vh auto;max-width:30rem;padding:0 1.3rem}button{font:inherit;background:#1258b0;color:white;padding:.65rem 1rem;border:0;border-radius:.6rem;cursor:pointer}a{color:#1258b0}</style>
<main><h1>Sign in to NYC Schools Ratings</h1>
<p id="message" role="status">Want to use the app? Open this email on the iPhone or iPad where you requested it. You can also sign in to this browser instead.</p>
<button id="continue" type="button" hidden>Continue in this browser</button>
<p><a href="/login">Request a new sign-in link</a></p><noscript>Enable JavaScript to use this link in your browser.</noscript></main>
<script nonce="${nonce}">
const token = location.hash.slice(1), button = document.getElementById("continue"), message = document.getElementById("message");
history.replaceState(null, "", location.pathname);
if (token.length !== 64 || /[^0-9a-f]/.test(token)) {
  message.textContent = "This link is incomplete. Request a new sign-in link.";
} else {
  button.hidden = false;
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/magic-link/verify", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", body: new URLSearchParams({token}) });
      if (!response.ok || !(await response.json()).success) {
        message.textContent = "This link could not sign you in. Request a fresh link.";
        return;
      }
      location.replace("/family");
    } catch {
      message.textContent = "Could not confirm sign-in. Check your connection and try again.";
      button.disabled = false;
    }
  });
}
</script></html>`, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
  } });
}
