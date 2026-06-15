const fs = require('fs');
const path = require('path');

const seedDataDir = path.join(__dirname, '..', 'data');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : seedDataDir;

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const cache = {};
let hydrated = false;
let readyPromise = null;
let supabaseHealthy = false;

function filePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function seedFilePath(name) {
  return path.join(seedDataDir, `${name}.json`);
}

function readLocal(name, fallback = []) {
  const p = filePath(name);

  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
  }

  const seed = seedFilePath(name);

  if (fs.existsSync(seed)) {
    try {
      const data = JSON.parse(fs.readFileSync(seed, 'utf8'));
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return data;
    } catch {
      return fallback;
    }
  }

  fs.writeFileSync(p, JSON.stringify(fallback, null, 2));
  return fallback;
}

function writeLocal(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

async function supabaseFetch(pathname, options = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${pathname}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const text = await res.text();
    let data = null;

    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}: ${text}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function saveToSupabase(name, data) {
  if (!useSupabase) return;

  await supabaseFetch('femifresh_store?on_conflict=name', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      name,
      data,
      updated_at: new Date().toISOString()
    })
  });
}

function listLocalJsonNames() {
  const names = new Set();

  for (const dir of [seedDataDir, dataDir]) {
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.json')) names.add(file.replace(/\.json$/, ''));
    }
  }

  return [...names];
}

async function ensureDbReady() {
  if (!useSupabase) {
    hydrated = true;
    return;
  }

  if (readyPromise) {
    await readyPromise.catch(() => {});
    return;
  }

  readyPromise = (async () => {
    try {
      console.log('FemiFresh Supabase storage: loading...');

      const rows = await supabaseFetch('femifresh_store?select=name,data');
      const remoteNames = new Set();

      for (const row of rows || []) {
        remoteNames.add(row.name);
        cache[row.name] = row.data;
        writeLocal(row.name, row.data);
      }

      for (const name of listLocalJsonNames()) {
        if (!remoteNames.has(name)) {
          const localData = readLocal(name, []);
          cache[name] = localData;
          await saveToSupabase(name, localData);
          console.log(`Seeded ${name}.json into Supabase`);
        }
      }

      supabaseHealthy = true;
      hydrated = true;
      console.log('FemiFresh Supabase storage: ready');
    } catch (err) {
      supabaseHealthy = false;
      hydrated = true;
      console.error('FemiFresh Supabase storage failed. Site will continue with local JSON:', err.message);
    }
  })();

  await readyPromise.catch(() => {});
}

function read(name, fallback = []) {
  if (cache[name] !== undefined) return cache[name];

  const data = readLocal(name, fallback);
  cache[name] = data;
  return data;
}

function write(name, data) {
  cache[name] = data;
  writeLocal(name, data);

  if (useSupabase && hydrated) {
    saveToSupabase(name, data).then(() => {
      supabaseHealthy = true;
    }).catch(err => {
      supabaseHealthy = false;
      console.error(`Supabase save failed for ${name}:`, err.message);
    });
  }
}

global.ensureFemiDbReady = ensureDbReady;

console.log('FemiFresh storage:', useSupabase ? 'Supabase' : 'Local JSON');
console.log('FemiFresh DATA_DIR:', dataDir);

module.exports = { read, write, dataDir, ensureDbReady };
