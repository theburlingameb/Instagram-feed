#!/usr/bin/env node
/**
 * refresh-token.js
 *
 * Refreshes the long-lived Instagram access token, extending it another
 * ~60 days. Instagram rejects refresh attempts made less than 24 hours
 * apart, so this must run on its own, slower schedule (daily is the
 * practical max frequency, weekly is plenty of margin) -- separate from
 * fetch-feed.js, which can run as often as you like.
 *
 * Required env vars:
 *   IG_ACCESS_TOKEN  - current long-lived access token
 *
 * Prints the new token on its own stdout line as NEW_TOKEN=... so a CI
 * step can capture it and persist it (e.g. back into a repo secret).
 */

const ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('Missing IG_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

async function refreshToken(token) {
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function main() {
  console.error('Refreshing access token...');
  const newToken = await refreshToken(ACCESS_TOKEN);
  console.log('NEW_TOKEN=' + newToken);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
