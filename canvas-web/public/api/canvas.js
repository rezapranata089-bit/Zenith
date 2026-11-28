const PROJECT_ID = "zenith-canvas-17133";
const API_KEY = "AIzaSyCO8txNS4UPwjrRKplPenuL-RA557gGhco";
const OLD_MANIFEST = "https://vivimusicanvas.mkmdevilmi.workers.dev/canvas.json";
const crypto = require("crypto");
const CACHE_MS = 60 * 1000;
const MAX_SKEW_SECONDS = 12 * 60 * 60;
const cache = { items: null, at: 0 };

const DOCS = "projects/" + PROJECT_ID + "/databases/(default)/documents";
const tokenCache = { value: "", exp: 0 };
const seenToday = { day: "", ids: new Set() };

function b64u(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

async function googleToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.value && tokenCache.exp - 60 > now) return tokenCache.value;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const head = b64u({ alg: "RS256", typ: "JWT" });
  const claim = b64u({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  });
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: head + "." + claim + "." + sig
    }),
    signal: AbortSignal.timeout(8000)
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("google token " + res.status);
  tokenCache.value = json.access_token;
  tokenCache.exp = now + (json.expires_in || 3600);
  return tokenCache.value;
}

// Counts each visitor once per UTC day and per country in Firestore:
// stats/YYYY-MM-DD { users, c_ID, c_US, ... }. Only a salted hash is kept, never the IP.
async function track(req) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return;
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const ip = forwarded || String(req.headers["x-real-ip"] || "") || "unknown";
    const raw = String(req.headers["x-vercel-ip-country"] || "");
    const country = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : "XX";
    const day = new Date().toISOString().slice(0, 10);
    const id = crypto.createHash("sha256")
      .update(day + "|" + ip + "|" + (process.env.CANVAS_SECRET || "zenith"))
      .digest("hex").slice(0, 24);
    if (seenToday.day !== day || seenToday.ids.size > 20000) {
      seenToday.day = day;
      seenToday.ids.clear();
    }
    if (seenToday.ids.has(id)) return;
    seenToday.ids.add(id);
    const token = await googleToken();
    const sent = await fetch("https://firestore.googleapis.com/v1/" + DOCS + ":commit", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: DOCS + "/statUsers/" + day + "_" + id,
              fields: {
                day: { stringValue: day },
                country: { stringValue: country }
              }
            },
            currentDocument: { exists: false }
          },
          {
            update: { name: DOCS + "/stats/" + day, fields: {} },
            updateMask: { fieldPaths: [] },
            updateTransforms: [
              { fieldPath: "users", increment: { integerValue: "1" } },
              { fieldPath: "c_" + country, increment: { integerValue: "1" } }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!sent.ok && sent.status !== 409) {
      console.error("track failed", sent.status, (await sent.text()).slice(0, 300));
    }
  } catch (error) {
    // Counting must never break the API; a 409 just means already counted today.
    console.error("track error", String(error.message || error));
  }
}

function authorized(req) {
  const secret = process.env.CANVAS_SECRET;
  if (!secret) return true;
  const time = String(req.headers["x-zenith-time"] || "");
  const sig = String(req.headers["x-zenith-sig"] || "");
  if (!/^\d+$/.test(time)) return false;
  if (Math.abs(Date.now() / 1000 - Number(time)) > MAX_SKEW_SECONDS) return false;
  const want = crypto.createHmac("sha256", secret).update(time).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function norm(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function str(field) {
  return field && field.stringValue !== undefined ? field.stringValue : "";
}

function num(field) {
  return field && field.integerValue !== undefined ? Number(field.integerValue) : 0;
}

async function loadOwn() {
  const url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
    "/databases/(default)/documents:runQuery?key=" + API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "canvases" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "approved" }
          }
        },
        limit: 1000
      }
    })
  });
  if (!res.ok) throw new Error("Firestore " + res.status);
  const rows = await res.json();
  const best = new Map();
  for (const row of rows) {
    if (!row.document) continue;
    const f = row.document.fields || {};
    const item = {
      song: str(f.song),
      artist: str(f.artist),
      album: str(f.album),
      url: str(f.url),
      likes: num(f.likes)
    };
    if (!item.song || !item.artist || !item.url) continue;
    const id = norm(item.song) + "|" + norm(item.artist) + "|" + norm(item.album);
    const current = best.get(id);
    if (!current || item.likes > current.likes) best.set(id, item);
  }
  return [...best.values()]
    .sort((a, b) => b.likes - a.likes)
    .map(({ song, artist, album, url }) => ({ song, artist, album, url }));
}

async function loadOld() {
  try {
    const res = await fetch(OLD_MANIFEST, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    return [];
  }
}

module.exports = async (req, res) => {
  if (!authorized(req)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const tracked = track(req);
  try {
    if (!cache.items || Date.now() - cache.at > CACHE_MS) {
      const [own, old] = await Promise.all([loadOwn(), loadOld()]);
      const seen = new Set(own.map((item) => item.url));
      cache.items = own.concat(old.filter((item) => item && item.url && !seen.has(item.url)));
      cache.at = Date.now();
    }
    const items = cache.items;
    await tracked;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(JSON.stringify({ items }));
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(error.message || error) });
  }
};