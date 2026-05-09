#!/usr/bin/env node
import fs from "node:fs";
import { google } from "googleapis";

const clientSecretPath = process.argv[2] || "";
if (!clientSecretPath || !fs.existsSync(clientSecretPath)) {
  console.error("Usage: node scripts/generate-google-refresh-token.mjs /path/to/client_secret.json");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(clientSecretPath, "utf8"));
const cfg = raw.installed || raw.web;
if (!cfg?.client_id || !cfg?.client_secret) {
  console.error("Invalid client secret file: expected installed/web client_id and client_secret");
  process.exit(1);
}

const redirectUri = process.env.REDIRECT_URI || "http://localhost";
const outputPath = process.env.OUTPUT_PATH || "/tmp/wrkflo-google-credential.json";
const oauthCode = process.env.OAUTH_CODE || "";

const scopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify"
];

const oauth2 = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirectUri);

if (!oauthCode) {
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: false,
    scope: scopes
  });

  console.log("Open this URL in Chrome and sign in as wrkflo.biz@gmail.com:");
  console.log(authUrl);
  console.log("");
  console.log("After approval, copy the `code` query parameter from the redirected URL and run:");
  console.log(`OAUTH_CODE='PASTE_CODE' node ./scripts/generate-google-refresh-token.mjs ${clientSecretPath}`);
  process.exit(0);
}

const { tokens } = await oauth2.getToken(oauthCode);
const refreshToken = tokens.refresh_token || "";
const accessToken = tokens.access_token || "";

if (!refreshToken) {
  console.error("No refresh token returned. Re-run without OAUTH_CODE and re-authorize with consent.");
  process.exit(1);
}

let email = "";
if (accessToken) {
  const resp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (resp.ok) {
    const profile = await resp.json();
    email = profile.email || "";
  }
}

const out = {
  client_id: cfg.client_id,
  client_secret: cfg.client_secret,
  refresh_token: refreshToken,
  scopes,
  account_email: email,
  created_at: new Date().toISOString()
};

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
console.log(`Saved credential file: ${outputPath}`);
console.log(`Account email: ${email || "unknown"}`);
console.log("Scopes count:", scopes.length);
