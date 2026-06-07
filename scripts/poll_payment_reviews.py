#!/usr/bin/env python3
"""Poll payment_reviews for new pending orders and notify via stdout."""
import json
import urllib.request
import os
import time

SUPABASE_TOKEN = os.environ.get("SUPABASE_MGMT_TOKEN") or os.environ.get("HERMES_SUPABASE_TOKEN") or ""
if not SUPABASE_TOKEN:
    # Try reading from a file
    token_path = os.path.expanduser("~/.supabase/mgmt-token")
    if os.path.exists(token_path):
        with open(token_path) as f:
            SUPABASE_TOKEN = f.read().strip()
PROJECT_REF = "aondldqwwvttwpervrfq"
DB_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
LAST_SEEN_FILE = os.path.expanduser("~/.hermes/data/payment_reviews_last_seen.txt")

def db_query(sql):
    data = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        DB_URL,
        data=data,
        headers={
            "Authorization": f"Bearer {SUPABASE_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.0",
        },
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())

def main():
    os.makedirs(os.path.dirname(LAST_SEEN_FILE), exist_ok=True)

    # Read last seen timestamp
    last_seen = ""
    if os.path.exists(LAST_SEEN_FILE):
        with open(LAST_SEEN_FILE) as f:
            last_seen = f.read().strip()

    # Query new pending reviews
    if last_seen:
        sql = f"""
        SELECT pr.id, pr.short_code, pr.created_at,
               p.display_name,
               s.display_name as subject_name, s.code
        FROM payment_reviews pr
        JOIN profiles p ON p.id = pr.user_id
        JOIN subjects s ON s.id = pr.subject_id
        WHERE pr.status = 'pending'
          AND pr.created_at > '{last_seen}'::timestamptz
        ORDER BY pr.created_at ASC
        """
    else:
        sql = f"""
        SELECT pr.id, pr.short_code, pr.created_at,
               p.display_name,
               s.display_name as subject_name, s.code
        FROM payment_reviews pr
        JOIN profiles p ON p.id = pr.user_id
        JOIN subjects s ON s.id = pr.subject_id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at ASC
        LIMIT 10
        """

    try:
        results = db_query(sql)
    except Exception as e:
        print(f"[ERROR] Query failed: {e}", flush=True)
        return

    if not results:
        return  # silent — nothing new

    new_last_seen = ""
    for row in results:
        display_name = row.get("display_name") or "未知用户"
        subject = f"{row.get('subject_name')} ({row.get('code')})" if row.get('code') else row.get('subject_name')
        short_code = row.get("short_code") or "无"
        created = row.get("created_at", "")

        print(f"💰 新订单 | 用户: {display_name} | 科目: {subject} | 备注码: {short_code}", flush=True)

        if created and created > new_last_seen:
            new_last_seen = created

    # Update last seen
    if new_last_seen:
        with open(LAST_SEEN_FILE, "w") as f:
            f.write(new_last_seen)

if __name__ == "__main__":
    main()
