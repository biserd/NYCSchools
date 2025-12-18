import { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { oauthAuthorizationCodes, oauthAccessTokens, oauthRefreshTokens, type User } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { verifyPassword } from "./auth";

const CLIENT_ID = "chatgpt-nycschoolratings";
const AUTH_CODE_EXPIRY_MINS = 10;
const ACCESS_TOKEN_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// Allowed redirect URIs for security (whitelist)
const ALLOWED_REDIRECT_URIS = [
  "https://chat.openai.com/aip/plugin/oauth/callback",
  "https://chat.openai.com/callback",
  "https://chatgpt.com/aip/plugin/oauth/callback",
  "https://chatgpt.com/callback",
  "https://platform.openai.com/",
  "http://localhost:5000/oauth/callback", // For local testing only
];

function isValidRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_URIS.some(allowed => uri.startsWith(allowed));
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

async function createAuthorizationCode(
  userId: string,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  scope?: string
): Promise<string> {
  const code = generateToken();
  const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MINS * 60 * 1000);

  await db.insert(oauthAuthorizationCodes).values({
    code,
    userId,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: "S256",
    scope,
    expiresAt,
  });

  return code;
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const authCode = await db.query.oauthAuthorizationCodes.findFirst({
    where: and(
      eq(oauthAuthorizationCodes.code, code),
      gt(oauthAuthorizationCodes.expiresAt, new Date())
    ),
  });

  if (!authCode) {
    return null;
  }

  if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
    return null;
  }

  const expectedChallenge = sha256(codeVerifier);
  if (authCode.codeChallenge !== expectedChallenge) {
    return null;
  }

  await db.delete(oauthAuthorizationCodes).where(eq(oauthAuthorizationCodes.code, code));

  const accessToken = generateToken();
  const refreshToken = generateToken();
  const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(oauthAccessTokens).values({
    token: accessToken,
    userId: authCode.userId,
    clientId,
    scope: authCode.scope,
    expiresAt: accessTokenExpiry,
  });

  await db.insert(oauthRefreshTokens).values({
    token: refreshToken,
    accessToken,
    userId: authCode.userId,
    clientId,
    scope: authCode.scope,
    expiresAt: refreshTokenExpiry,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60,
  };
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const storedRefresh = await db.query.oauthRefreshTokens.findFirst({
    where: and(
      eq(oauthRefreshTokens.token, refreshToken),
      gt(oauthRefreshTokens.expiresAt, new Date())
    ),
  });

  if (!storedRefresh || storedRefresh.clientId !== clientId) {
    return null;
  }

  await db.delete(oauthAccessTokens).where(eq(oauthAccessTokens.token, storedRefresh.accessToken));
  await db.delete(oauthRefreshTokens).where(eq(oauthRefreshTokens.token, refreshToken));

  const newAccessToken = generateToken();
  const newRefreshToken = generateToken();
  const accessTokenExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(oauthAccessTokens).values({
    token: newAccessToken,
    userId: storedRefresh.userId,
    clientId,
    scope: storedRefresh.scope,
    expiresAt: accessTokenExpiry,
  });

  await db.insert(oauthRefreshTokens).values({
    token: newRefreshToken,
    accessToken: newAccessToken,
    userId: storedRefresh.userId,
    clientId,
    scope: storedRefresh.scope,
    expiresAt: refreshTokenExpiry,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60,
  };
}

export async function getUserFromAccessToken(accessToken: string): Promise<User | null> {
  const storedToken = await db.query.oauthAccessTokens.findFirst({
    where: and(
      eq(oauthAccessTokens.token, accessToken),
      gt(oauthAccessTokens.expiresAt, new Date())
    ),
  });

  if (!storedToken) {
    return null;
  }

  const user = await storage.getUser(storedToken.userId);
  return user || null;
}

export function setupOAuth(app: Express) {
  app.get("/oauth/authorize", (req: Request, res: Response) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope,
    } = req.query;

    if (response_type !== "code") {
      return res.status(400).json({ error: "unsupported_response_type" });
    }

    if (client_id !== CLIENT_ID) {
      return res.status(400).json({ error: "invalid_client" });
    }

    if (!code_challenge || code_challenge_method !== "S256") {
      return res.status(400).json({ error: "invalid_request", error_description: "PKCE S256 required" });
    }

    if (!redirect_uri || typeof redirect_uri !== 'string') {
      return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri required" });
    }

    // Validate redirect_uri against whitelist
    if (!isValidRedirectUri(redirect_uri)) {
      return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri not allowed" });
    }

    const loginPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to NYC School Ratings</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo h1 {
      font-size: 24px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .logo p {
      color: #666;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .info {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
    .info a {
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>NYC School Ratings</h1>
      <p>Connect your account to ChatGPT</p>
    </div>
    <div id="error" class="error" style="display: none;"></div>
    <form id="loginForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@example.com">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="Your password">
      </div>
      <button type="submit">Connect Account</button>
    </form>
    <p class="info">
      Don't have an account? <a href="https://nycschoolsratings.com/login" target="_blank">Sign up</a>
    </p>
  </div>
  <script>
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('error');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/oauth/authorize/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            client_id: '${client_id}',
            redirect_uri: '${redirect_uri}',
            code_challenge: '${code_challenge}',
            state: '${state || ''}',
            scope: '${scope || ''}'
          })
        });
        
        const data = await response.json();
        
        if (data.redirect) {
          window.location.href = data.redirect;
        } else if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = 'block';
        }
      } catch (err) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
      }
    });
  </script>
</body>
</html>
    `;

    res.send(loginPageHtml);
  });

  app.post("/oauth/authorize/submit", async (req: Request, res: Response) => {
    const { email, password, client_id, redirect_uri, code_challenge, state, scope } = req.body;

    // Validate all required OAuth parameters
    if (!client_id || client_id !== CLIENT_ID) {
      return res.status(400).json({ error: "Invalid client" });
    }

    if (!redirect_uri || !code_challenge) {
      return res.status(400).json({ error: "Missing required OAuth parameters" });
    }

    // Validate redirect_uri against whitelist
    if (!isValidRedirectUri(redirect_uri)) {
      return res.status(400).json({ error: "Redirect URI not allowed" });
    }

    // Validate credentials are provided and non-empty strings
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await storage.getUserByEmail(email.trim().toLowerCase());
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const code = await createAuthorizationCode(
      user.id,
      client_id,
      redirect_uri,
      code_challenge,
      scope
    );

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    res.json({ redirect: redirectUrl.toString() });
  });

  app.post("/oauth/token", async (req: Request, res: Response) => {
    const { grant_type, code, redirect_uri, client_id, code_verifier, refresh_token } = req.body;

    if (grant_type === "authorization_code") {
      if (!code || !redirect_uri || !code_verifier) {
        return res.status(400).json({ error: "invalid_request" });
      }

      const tokens = await exchangeCodeForTokens(code, code_verifier, redirect_uri, client_id || CLIENT_ID);
      if (!tokens) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      return res.json({
        access_token: tokens.accessToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
      });
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        return res.status(400).json({ error: "invalid_request" });
      }

      const tokens = await refreshAccessToken(refresh_token, client_id || CLIENT_ID);
      if (!tokens) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      return res.json({
        access_token: tokens.accessToken,
        token_type: "Bearer",
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
      });
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
  });
}
