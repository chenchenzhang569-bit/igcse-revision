#!/usr/bin/env python3
"""
IGMaster 数据库备份脚本
每天凌晨运行，将 Supabase 所有表导出为 JSON 并压缩保存。

用法:
  python3 scripts/backup_db.py                    # 备份到默认目录
  python3 scripts/backup_db.py --dir /backups/db  # 指定输出目录

定时任务 (crontab):
  0 3 * * * cd /home/ubuntu/igcse-revision && python3 scripts/backup_db.py >> logs/backup.log 2>&1
"""

import urllib.request
import json
import gzip
import os
import sys
import argparse
from datetime import datetime

# ===== 配置 =====
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"

# 需要备份的表（按依赖顺序，先备份无外键依赖的表）
TABLES = [
    "exam_boards",
    "subjects",
    "topics",
    "subtopics",
    "questions",
    "notes",
    "past_papers",
    "purchases",
    "profiles",
    "error_reports",
    "login_events",
    "user_roles",
    "app_config",
    "mock_exam_sets",
    "mock_exam_papers",
    "mock_exam_questions",
    "mock_exams",
    "user_answers",
    "user_bookmarks",
    "user_bans",
    "user_security_log",
]

# 大表分批拉取的行数
PAGE_SIZE = 1000


def make_headers():
    return {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Accept": "application/json",
    }


def fetch_all_rows(table: str) -> list:
    """分批拉取表的所有行"""
    headers = make_headers()
    all_rows = []
    offset = 0

    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?offset={offset}&limit={PAGE_SIZE}"
        req = urllib.request.Request(url, headers=headers)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            rows = json.loads(resp.read().decode())
            if not rows:
                break
            all_rows.extend(rows)
            offset += PAGE_SIZE
            if len(rows) < PAGE_SIZE:
                break
        except urllib.error.HTTPError as e:
            print(f"  ⚠️  {table}: HTTP {e.code} - {e.read().decode()[:100]}")
            break
        except Exception as e:
            print(f"  ⚠️  {table}: {str(e)[:100]}")
            break

    return all_rows


def fetch_auth_users() -> list:
    """获取所有 Auth 用户"""
    headers = make_headers()
    all_users = []
    page = 1
    per_page = 200

    while True:
        url = f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page={per_page}"
        req = urllib.request.Request(url, headers=headers)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read().decode())
            users = data.get("users", [])
            if not users:
                break
            # 只保留有用字段，去掉敏感信息
            sanitized = []
            for u in users:
                sanitized.append({
                    "id": u.get("id"),
                    "email": u.get("email"),
                    "created_at": u.get("created_at"),
                    "last_sign_in_at": u.get("last_sign_in_at"),
                    "phone": u.get("phone"),
                    "confirmed_at": u.get("confirmed_at"),
                    "email_confirmed_at": u.get("email_confirmed_at"),
                })
            all_users.extend(sanitized)
            page += 1
            if len(users) < per_page:
                break
        except Exception as e:
            print(f"  ⚠️  auth users: {str(e)[:100]}")
            break

    return all_users


def main():
    parser = argparse.ArgumentParser(description="IGMaster 数据库备份")
    parser.add_argument("--dir", default=os.path.expanduser("~/backups/db"),
                        help="备份文件输出目录 (默认: ~/backups/db)")
    parser.add_argument("--no-auth", action="store_true",
                        help="跳过 Auth 用户备份")
    args = parser.parse_args()

    backup_dir = args.dir
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_data = {
        "backup_at": datetime.now().isoformat(),
        "version": "1.0",
        "tables": {},
    }

    total_rows = 0
    total_tables = 0

    print(f"📦 IGMaster 数据库备份 - {timestamp}")
    print(f"   输出目录: {backup_dir}")
    print()

    # 1. 备份所有表
    for table in TABLES:
        print(f"  📋 {table}...", end=" ", flush=True)
        rows = fetch_all_rows(table)
        backup_data["tables"][table] = rows
        total_rows += len(rows)
        total_tables += 1
        print(f"{len(rows)} 行")

    # 2. 备份 Auth 用户
    if not args.no_auth:
        print(f"  👤 auth users...", end=" ", flush=True)
        users = fetch_auth_users()
        backup_data["auth_users"] = users
        total_rows += len(users)
        print(f"{len(users)} 个用户")
    else:
        backup_data["auth_users"] = []

    # 3. 保存到文件
    backup_file = os.path.join(backup_dir, f"igmaster_backup_{timestamp}.json.gz")
    json_bytes = json.dumps(backup_data, ensure_ascii=False, default=str).encode("utf-8")
    with gzip.open(backup_file, "wb", compresslevel=9) as f:
        f.write(json_bytes)

    file_size_mb = len(json_bytes) / 1024 / 1024
    compressed_size = os.path.getsize(backup_file) / 1024 / 1024

    print()
    print(f"✅ 备份完成!")
    print(f"   表: {total_tables}, 总行数: {total_rows}")
    print(f"   原始大小: ~{file_size_mb:.1f}MB, 压缩后: {compressed_size:.1f}MB")
    print(f"   文件: {backup_file}")

    # 4. 清理旧备份（保留最近 30 天）
    cleanup_days = 30
    cutoff = datetime.now().timestamp() - cleanup_days * 86400
    deleted = 0
    for f in os.listdir(backup_dir):
        fpath = os.path.join(backup_dir, f)
        if os.path.isfile(fpath) and f.endswith(".json.gz"):
            if os.path.getmtime(fpath) < cutoff:
                os.remove(fpath)
                deleted += 1
    if deleted:
        print(f"   已清理 {deleted} 个 {cleanup_days} 天前的旧备份")


if __name__ == "__main__":
    main()
