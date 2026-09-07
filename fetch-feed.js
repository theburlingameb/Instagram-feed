#!/usr/bin/env node
/**
 * fetch-feed.js
 *
 * Fetches recent media using the CURRENT access token and writes it to
 * public/feed.json. Does not touch the token in any way, so this is safe
 * to run as often as you like (well within the 200 req/hour limit).
 *
 * Required env vars:
 *   IG_ACCESS_TOKEN  - current long-lived access token
 *   IG_USER_ID       - the Instagram Business account's user id
 *
 * Optional env vars:
 *   FEED_OUTPUT_PATH - where to write the JSON (default: ./public/feed.json)
 *   FEED_LIMIT       - how many posts to include (default: 12)
 */

const fs = require('fs');
const path = require('path');

const ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = process.env.IG_USER_ID;
const OUTPUT_PATH = process.env.FEED_OUTPUT_PATH || path.join(__dirname, 'public', 'feed.json');
const MEDIA_LIMIT = process.env.FEED_LIMIT || 12;

if (!ACCESS_TOKEN || !USER_ID) {
  console.error('Missing IG_ACCESS_TOKEN or IG_USER_ID environment variables.');
  process.exit(1);
}

async function fetchProfile(token) {
  const fields = ['username', 'profile_picture_url', 'followers_count', 'media_count'].join(',');
  const url = `https://graph.instagram.com/me?fields=${fields}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Profile fetch failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function fetchMedia(token, userId, limit) {
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp'
  ].join(',');

  const url = `https://graph.instagram.com/${userId}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Media fetch failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.data || [];
}

async function main() {
  console.error('Fetching profile...');
  const profile = await fetchProfile(ACCESS_TOKEN);

  console.error('Fetching recent media...');
  const media = await fetchMedia(ACCESS_TOKEN, USER_ID, MEDIA_LIMIT);

  const feed = {
    updated_at: new Date().toISOString(),
    profile: {
      username: profile.username,
      profile_picture_url: profile.profile_picture_url,
      followers_count: profile.followers_count,
      media_count: profile.media_count
    },
    items: media.map(item => ({
      id: item.id,
      caption: item.caption || '',
      media_type: item.media_type, // IMAGE | VIDEO | CAROUSEL_ALBUM
      image: item.media_type === 'VIDEO' ? (item.thumbnail_url || item.media_url) : item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp
    }))
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(feed, null, 2));
  console.error(`Wrote ${feed.items.length} items to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
