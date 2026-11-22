import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { appSignInPath, iosSignInResource, signInEmailUrl } from "../server/iosSignIn.ts";

const site = "https://nycschoolsratings.com", token = "a1".repeat(32);
const file = "/.well-known/apple-app-site-association";
const resource = (path, method = "GET") => iosSignInResource(new Request(site + path, { method }));

test("only app requests on the release origin get a Universal Link", () => {
  const app = new URL(signInEmailUrl(site, token, "/family", "ios"));
  assert.equal(app.href, site + appSignInPath + "#" + token);
  assert.equal(app.search, "");
  for (const client of [undefined, "website", "https://other.example"]) {
    assert.equal(signInEmailUrl(site, token, "/family", client), site + "/auth/magic-link/callback?token=" + token + "&returnTo=%2Ffamily");
  }
  assert.match(signInEmailUrl("https://stage.example", token, "/family", "ios"), /\/auth\/magic-link\/callback\?/);
});

test("Apple receives direct JSON for only the intended bundle and path", async () => {
  const res = resource(file);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/json");
  assert.equal(res.headers.get("location"), null);
  assert.deepEqual(await res.json(), { applinks: { details: [{
    appIDs: ["DB5JRGGB6A.com.nycschoolsratings.ios"], components: [{ "/": "/auth/ios/sign-in" }],
  }] } });
  for (const path of [file, appSignInPath]) {
    assert.equal(await resource(path, "HEAD").text(), "");
    assert.equal(resource(path, "POST").status, 405);
    assert.equal(iosSignInResource(new Request("https://another.example" + path)), undefined);
  }
  assert.equal(resource("/auth/magic-link/callback"), undefined);
});

async function openFallback(fragment, result) {
  const res = resource(appSignInPath);
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("cache-control"), /no-store/);
  const html = await res.text();
  const [, nonce, script] = html.match(/<script nonce="([^"]+)">([\s\S]+?)<\/script>/);
  assert.ok(res.headers.get("content-security-policy").includes("script-src 'nonce-" + nonce + "'"));
  const calls = [], redirects = [], history = [], message = {}, button = { hidden: true,
    addEventListener(type, fn) { assert.equal(type, "click"); this.click = fn; }
  };
  vm.runInNewContext(script, {
    URLSearchParams, document: { getElementById: id => id === "continue" ? button : message },
    history: { replaceState: (...args) => history.push(args[2]) },
    location: { hash: fragment, pathname: appSignInPath, replace: url => redirects.push(url) },
    fetch: async (url, options) => { calls.push({ url, ...options }); return result; },
  });
  assert.deepEqual(history, [appSignInPath]);
  assert.equal(calls.length, 0);
  return { calls, redirects, message, button };
}

test("a preview never redeems; explicit browser confirmation posts once, then opens Family", async () => {
  const { calls, redirects, button } = await openFallback("#" + token, Response.json({ success: true }));
  assert.equal(button.hidden, false);
  await Promise.all([button.click(), button.click()]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, "/api/auth/magic-link/verify");
  assert.equal(calls[0].body.get("token"), token);
  assert.deepEqual(redirects, ["/family"]);
});

test("invalid fragments never offer redemption; expired links do not show success", async () => {
  for (const hash of ["", "#invalid", "#" + token + "%0A", "#" + token + "&next=elsewhere"]) {
    assert.equal((await openFallback(hash)).button.hidden, true);
  }
  const { button, redirects, message } = await openFallback("#" + token, new Response(null, { status: 400 }));
  await button.click();
  assert.equal(redirects.length, 0);
  assert.match(message.textContent, /fresh link/);
});
