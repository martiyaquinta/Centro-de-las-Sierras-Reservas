#!/usr/bin/env python3
"""Setup Supabase remoto para web-reservas (schema + storage + fotos).

Requiere .env.local con URL/anon/service_role y UNA de:
  SUPABASE_DB_PASSWORD
  DATABASE_URL
  SUPABASE_ACCESS_TOKEN (sbp_...)

Uso:
  python3 scripts/setup_supabase.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("Falta psycopg2", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "supabase/migrations"
PHOTOS_DIR = ROOT / "public/photos"


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for name in (".env.local", ".env"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if not m:
                continue
            env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return env


def project_ref(url: str) -> str:
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not m:
        raise SystemExit(f"URL inválida: {url}")
    return m.group(1)


def apply_sql_pg(conninfo: str, sql: str) -> None:
    conn = psycopg2.connect(conninfo, sslmode="require")
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        print("✓ SQL aplicado via Postgres")
    finally:
        conn.close()


def apply_sql_management(token: str, ref: str, sql: str) -> None:
    endpoint = f"https://api.supabase.com/v1/projects/{ref}/database/query"
    req = urllib.request.Request(
        endpoint,
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            res.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"Management API {e.code}: {body[:500]}") from e
    print("✓ SQL aplicado via Management API")


def candidate_db_urls(ref: str, password: str) -> list[str]:
    from urllib.parse import quote_plus

    enc = quote_plus(password)
    # regions comunes + direct host
    regions = [
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "sa-east-1",
        "eu-west-1",
        "eu-west-2",
        "eu-central-1",
    ]
    urls = [f"postgresql://postgres:{enc}@db.{ref}.supabase.co:5432/postgres"]
    for r in regions:
        urls.append(
            f"postgresql://postgres.{ref}:{enc}@aws-0-{r}.pooler.supabase.com:5432/postgres"
        )
        urls.append(
            f"postgresql://postgres.{ref}:{enc}@aws-1-{r}.pooler.supabase.com:5432/postgres"
        )
    return urls


def rest(url: str, key: str, method: str, path: str, body: bytes | None = None, extra: dict | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url.rstrip("/") + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def upload_photos(base: str, service: str) -> None:
    files = [
        ("depto-hero.jpg", "gallery/depto-hero.jpg", "Hero", True, 0),
        ("depto-01.jpg", "gallery/depto-01.jpg", "Living", False, 1),
        ("depto-02.jpg", "gallery/depto-02.jpg", "Ambiente", False, 2),
        ("depto-03.jpg", "gallery/depto-03.jpg", "Detalle", False, 3),
        ("depto-04.jpg", "gallery/depto-04.jpg", "Vista", False, 4),
    ]

    # wipe local-path leftovers if any
    rest(
        base,
        service,
        "DELETE",
        "/rest/v1/photos?storage_path=like./%",
        extra={"Prefer": "return=minimal"},
    )

    for local_name, storage_path, alt, is_cover, sort in files:
        local = PHOTOS_DIR / local_name
        if not local.exists():
            print("skip missing", local_name)
            continue
        data = local.read_bytes()
        status, body = rest(
            base,
            service,
            "POST",
            f"/storage/v1/object/property-photos/{storage_path}",
            body=data,
            extra={
                "Content-Type": "image/jpeg",
                "x-upsert": "true",
            },
        )
        if status not in (200, 201):
            # try update path
            status2, body2 = rest(
                base,
                service,
                "PUT",
                f"/storage/v1/object/property-photos/{storage_path}",
                body=data,
                extra={"Content-Type": "image/jpeg"},
            )
            if status2 not in (200, 201):
                raise SystemExit(
                    f"upload {local_name} failed {status}/{status2}: {body[:200]!r} {body2[:200]!r}"
                )

        # upsert photo row: delete+insert simple
        rest(
            base,
            service,
            "DELETE",
            f"/rest/v1/photos?storage_path=eq.{storage_path}",
            extra={"Prefer": "return=minimal"},
        )
        payload = json.dumps(
            {
                "storage_path": storage_path,
                "alt": alt,
                "sort_order": sort,
                "is_cover": is_cover,
            }
        ).encode()
        st, b = rest(
            base,
            service,
            "POST",
            "/rest/v1/photos",
            body=payload,
            extra={"Content-Type": "application/json", "Prefer": "return=minimal"},
        )
        if st not in (200, 201):
            raise SystemExit(f"photos insert {local_name}: {st} {b[:300]!r}")
        print("✓ foto", local_name)

    st, b = rest(base, service, "GET", "/rest/v1/property?select=id&limit=1")
    if st != 200:
        raise SystemExit(f"property get: {st} {b[:200]!r}")
    rows = json.loads(b.decode())
    if rows:
        pid = rows[0]["id"]
        payload = json.dumps({"cover_photo_path": "gallery/depto-hero.jpg"}).encode()
        st, b = rest(
            base,
            service,
            "PATCH",
            f"/rest/v1/property?id=eq.{pid}",
            body=payload,
            extra={"Content-Type": "application/json", "Prefer": "return=minimal"},
        )
        if st not in (200, 204):
            raise SystemExit(f"cover update: {st} {b[:200]!r}")
        print("✓ cover_photo_path")


def verify(base: str, anon: str) -> None:
    st, b = rest(base, anon, "GET", "/rest/v1/property?select=name,whatsapp_e164&limit=1")
    print("property", st, b.decode()[:300])
    st, b = rest(
        base,
        anon,
        "GET",
        "/rest/v1/availability?status=eq.available&select=night_date&limit=5",
    )
    print("availability sample", st, b.decode()[:300])
    st, b = rest(base, anon, "GET", "/rest/v1/photos?select=storage_path,is_cover&order=sort_order")
    print("photos", st, b.decode()[:400])


def main() -> None:
    env = load_env()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    service = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not anon or not service:
        raise SystemExit("Faltan keys en .env.local")
    ref = project_ref(base)
    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        raise SystemExit(f"No hay migrations en {MIGRATIONS_DIR}")
    print("Proyecto", ref)
    print("Migrations:", ", ".join(p.name for p in migration_files))

    def apply_all(apply_fn) -> None:
        for path in migration_files:
            print("→", path.name)
            apply_fn(path.read_text())

    if env.get("DATABASE_URL"):
        apply_all(lambda sql: apply_sql_pg(env["DATABASE_URL"], sql))
    elif env.get("SUPABASE_ACCESS_TOKEN"):
        apply_all(
            lambda sql: apply_sql_management(env["SUPABASE_ACCESS_TOKEN"], ref, sql)
        )
    elif env.get("SUPABASE_DB_PASSWORD"):
        last = None
        applied = False
        for u in candidate_db_urls(ref, env["SUPABASE_DB_PASSWORD"]):
            try:
                apply_all(lambda sql, url=u: apply_sql_pg(url, sql))
                last = None
                applied = True
                break
            except Exception as e:  # noqa: BLE001
                last = e
                print("intento PG falló:", str(e)[:120])
        if not applied:
            raise SystemExit(f"No pude conectar a Postgres: {last}")
    else:
        raise SystemExit(
            "Necesito SUPABASE_DB_PASSWORD o DATABASE_URL o SUPABASE_ACCESS_TOKEN"
        )

    upload_photos(base, service)
    verify(base, anon)
    print("\nListo. Reiniciá `npm run dev` para cargar .env.local.")


if __name__ == "__main__":
    main()
