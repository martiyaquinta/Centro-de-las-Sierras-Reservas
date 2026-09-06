#!/usr/bin/env node
/**
 * Setup remoto Supabase para web-reservas.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Y UNA de:
 *   SUPABASE_DB_PASSWORD  (Settings → Database → Database password)
 *   DATABASE_URL          (postgres connection string)
 *   SUPABASE_ACCESS_TOKEN (token personal sbp_... del dueño del proyecto)
 *
 * Uso: node scripts/setup-supabase.mjs
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const env = { ...process.env };
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!url || !anon || !service || !ref) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / ANON / SERVICE_ROLE en .env.local");
  process.exit(1);
}

const sqlPath = join(root, "supabase/migrations/0001_init.sql");
const sql = readFileSync(sqlPath, "utf8");

async function runSqlViaPg(connectionString) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ SQL aplicado via Postgres");
  } finally {
    await client.end();
  }
}

async function runSqlViaManagement(token) {
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text.slice(0, 400)}`);
  }
  console.log("✓ SQL aplicado via Management API");
}

function dbUrlFromPassword(password) {
  const enc = encodeURIComponent(password);
  // pooler session mode + direct
  return [
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function applySql() {
  if (env.DATABASE_URL) {
    await runSqlViaPg(env.DATABASE_URL);
    return;
  }
  if (env.SUPABASE_DB_PASSWORD) {
    const urls = dbUrlFromPassword(env.SUPABASE_DB_PASSWORD);
    let lastErr;
    for (const u of urls) {
      try {
        await runSqlViaPg(u);
        return;
      } catch (e) {
        lastErr = e;
        console.warn("PG intento falló:", e.message);
      }
    }
    throw lastErr;
  }
  if (env.SUPABASE_ACCESS_TOKEN) {
    await runSqlViaManagement(env.SUPABASE_ACCESS_TOKEN);
    return;
  }
  throw new Error(
    "Necesito SUPABASE_DB_PASSWORD o DATABASE_URL o SUPABASE_ACCESS_TOKEN para crear tablas"
  );
}

async function uploadPhotos() {
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const photosDir = join(root, "public/photos");
  const files = [
    { file: "depto-hero.jpg", path: "gallery/depto-hero.jpg", alt: "Hero", cover: true, sort: 0 },
    { file: "depto-01.jpg", path: "gallery/depto-01.jpg", alt: "Living", cover: false, sort: 1 },
    { file: "depto-02.jpg", path: "gallery/depto-02.jpg", alt: "Ambiente", cover: false, sort: 2 },
    { file: "depto-03.jpg", path: "gallery/depto-03.jpg", alt: "Detalle", cover: false, sort: 3 },
    { file: "depto-04.jpg", path: "gallery/depto-04.jpg", alt: "Vista", cover: false, sort: 4 },
  ];

  // clean previous gallery rows pointing to local paths
  await sb.from("photos").delete().like("storage_path", "/%");

  for (const f of files) {
    const local = join(photosDir, f.file);
    if (!existsSync(local)) {
      console.warn("skip missing", f.file);
      continue;
    }
    const buf = readFileSync(local);
    const { error: upErr } = await sb.storage
      .from("property-photos")
      .upload(f.path, buf, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`upload ${f.file}: ${upErr.message}`);

    const { data: existing } = await sb
      .from("photos")
      .select("id")
      .eq("storage_path", f.path)
      .maybeSingle();

    if (existing) {
      await sb
        .from("photos")
        .update({ alt: f.alt, sort_order: f.sort, is_cover: f.cover })
        .eq("id", existing.id);
    } else {
      const { error } = await sb.from("photos").insert({
        storage_path: f.path,
        alt: f.alt,
        sort_order: f.sort,
        is_cover: f.cover,
      });
      if (error) throw new Error(`photos insert ${f.file}: ${error.message}`);
    }
    console.log("✓ foto", f.file);
  }

  const { data: prop } = await sb.from("property").select("id").limit(1).maybeSingle();
  if (prop) {
    await sb
      .from("property")
      .update({ cover_photo_path: "gallery/depto-hero.jpg" })
      .eq("id", prop.id);
    console.log("✓ cover_photo_path set");
  }
}

async function verify() {
  const sb = createClient(url, anon);
  const { data: prop, error: e1 } = await sb.from("property").select("name,whatsapp_e164").limit(1).maybeSingle();
  if (e1) throw e1;
  const { count: avail } = await sb
    .from("availability")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");
  const { count: photos } = await sb.from("photos").select("*", { count: "exact", head: true });
  console.log("✓ verify property:", prop);
  console.log("✓ available nights:", avail);
  console.log("✓ photos:", photos);
}

async function main() {
  console.log("Proyecto", ref);
  await applySql();
  await uploadPhotos();
  await verify();
  console.log("\nListo. Reiniciá el dev server para cargar .env.local.");
}

main().catch((e) => {
  console.error("\nERROR:", e.message || e);
  process.exit(1);
});
