import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { Client } = await import("pg");
    const client = new Client({
      connectionString: `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY}@db.aondldqwwvttwpervrfq.supabase.co:5432/postgres?sslmode=require`,
    });

    await client.connect();
    await client.query(`
      CREATE OR REPLACE FUNCTION atomic_analytics_pageview(
        p_page_url text,
        p_referrer text,
        p_device_type text,
        p_browser text,
        p_os text,
        p_session_id text
      ) RETURNS void
      LANGUAGE plpgsql
      AS $func$
      DECLARE
        v_val jsonb;
        v_today text;
        v_src text;
      BEGIN
        SELECT value INTO v_val FROM app_config WHERE key = 'analytics_v2' FOR UPDATE;

        IF v_val IS NULL THEN
          v_val := '{"total_pv":0,"total_visitors":0,"daily":{},"devices":{},"browsers":{},"os":{},"pages":{},"sources":{}}'::jsonb;
        END IF;

        v_today := to_char(now(), 'YYYY-MM-DD');

        v_val := jsonb_set(v_val, '{total_pv}', to_jsonb(COALESCE((v_val->>'total_pv')::int, 0) + 1));

        IF NOT (v_val->'daily' ? v_today) THEN
          v_val := jsonb_set(v_val, ARRAY['daily', v_today], '{"pv":0,"visitors":0,"bounces":0,"sessions":0,"total_time":0}'::jsonb);
        END IF;
        v_val := jsonb_set(v_val, ARRAY['daily', v_today, 'pv'], to_jsonb(COALESCE(((v_val->'daily')->v_today->>'pv')::int, 0) + 1));

        p_page_url := COALESCE(p_page_url, '/');
        v_val := jsonb_set(v_val, ARRAY['pages', p_page_url], to_jsonb(COALESCE(((v_val->'pages')->>p_page_url)::int, 0) + 1));

        p_device_type := COALESCE(p_device_type, 'desktop');
        v_val := jsonb_set(v_val, ARRAY['devices', p_device_type], to_jsonb(COALESCE(((v_val->'devices')->>p_device_type)::int, 0) + 1));

        p_browser := COALESCE(p_browser, 'other');
        v_val := jsonb_set(v_val, ARRAY['browsers', p_browser], to_jsonb(COALESCE(((v_val->'browsers')->>p_browser)::int, 0) + 1));

        p_os := COALESCE(p_os, 'other');
        v_val := jsonb_set(v_val, ARRAY['os', p_os], to_jsonb(COALESCE(((v_val->'os')->>p_os)::int, 0) + 1));

        IF p_referrer IS NULL OR p_referrer = '' THEN v_src := 'direct';
        ELSIF p_referrer LIKE '%google%' THEN v_src := 'google';
        ELSIF p_referrer LIKE '%baidu%' THEN v_src := 'baidu';
        ELSIF p_referrer LIKE '%bing%' THEN v_src := 'bing';
        ELSE v_src := coalesce(substring(p_referrer FROM 'https?://([^/]+)'), 'other'); END IF;
        v_val := jsonb_set(v_val, ARRAY['sources', v_src], to_jsonb(COALESCE(((v_val->'sources')->>v_src)::int, 0) + 1));

        INSERT INTO app_config (key, value, updated_at)
        VALUES ('analytics_v2', v_val, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
      END;
      $func$;
    `);
    await client.end();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack?.split('\n').slice(0,3).join('\n') }, { status: 500 });
  }
}
