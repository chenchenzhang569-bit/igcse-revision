#!/usr/bin/env python3
"""
IGMaster 完整备份脚本
每周日运行：数据库 + Storage 文件 + 代码仓库

用法:
  python3 scripts/backup_all.py                        # 备份全部
  python3 scripts/backup_all.py --type db              # 仅数据库
  python3 scripts/backup_all.py --type storage         # 仅 Storage
  python3 scripts/backup_all.py --type code            # 仅代码
"""

import urllib.request
import json
import gzip
import os
import sys
import subprocess
import argparse
from datetime import datetime, timedelta

# ===== 配置 =====
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_ROLE_KEY = "os.environ.get("SERVICE_ROLE_KEY", "")"
PROJECT_DIR = os.path.expanduser("~/igcse-revision")

# 所有表（按外键依赖排序）
TABLES = [
    "exam_boards", "subjects", "topics", "subtopics",
    "questions", "notes", "past_papers",
    "purchases", "profiles", "error_reports", "login_events",
    "user_roles", "app_config",
    "mock_exam_sets", "mock_exam_papers", "mock_exam_questions",
]

# Storage buckets
STORAGE_BUCKETS = ["past-papers", "mock-exams", "notes-pdfs", "sme-raw-backup", "sme-images", "scripts"]

PAGE_SIZE = 1000
RETENTION_DAYS = {
    "db": 30,       # 数据库备份保留30天
    "storage": 30,  # 文件备份保留30天
    "code": 7,      # 代码备份保留7天（GitHub本身有完整历史）
}


# ─────────── 数据库备份 ───────────

def fetch_all(table: str, headers: dict) -> list:
    rows, offset = [], 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?offset={offset}&limit={PAGE_SIZE}"
        req = urllib.request.Request(url, headers={"Accept": "application/json", **headers})
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            page = json.loads(resp.read().decode())
            if not page: break
            rows.extend(page); offset += PAGE_SIZE
            if len(page) < PAGE_SIZE: break
        except urllib.error.HTTPError as e:
            if e.code == 404: break  # 表不存在
            print(f"    ⚠️  HTTP {e.code}: {e.read().decode()[:100]}"); break
        except Exception as e:
            print(f"    ⚠️  {e}"); break
    return rows

def backup_db(backup_dir: str) -> str:
    print("  📋 导出数据库表...")
    headers = {"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {SERVICE_ROLE_KEY}"}
    data = {"backup_at": datetime.now().isoformat(), "tables": {}}
    total = 0
    for t in TABLES:
        print(f"    {t}...", end=" ", flush=True)
        rows = fetch_all(t, headers)
        data["tables"][t] = rows
        total += len(rows)
        print(f"{len(rows)} 行")

    # Auth 用户
    print("    auth_users...", end=" ", flush=True)
    users = []
    page = 1
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page=200",
            headers=headers
        )
        resp = urllib.request.urlopen(req, timeout=30)
        batch = json.loads(resp.read()).get("users", [])
        if not batch: break
        for u in batch:
            users.append({k: u.get(k) for k in ("id", "email", "created_at", "last_sign_in_at", "confirmed_at")})
        page += 1
        if len(batch) < 200: break
    data["auth_users"] = users
    print(f"{len(users)} 个用户")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(backup_dir, f"db_{ts}.json.gz")
    os.makedirs(backup_dir, exist_ok=True)
    with gzip.open(path, "w", compresslevel=9) as f:
        f.write(json.dumps(data, ensure_ascii=False, default=str).encode())
    mb = os.path.getsize(path) / 1024 / 1024
    print(f"  ✅ 数据库备份: {path} ({mb:.1f}MB, {total} 行)")
    return path


# ─────────── Storage 备份 ───────────

def backup_storage(backup_dir: str) -> str:
    print("  📦 下载 Storage 文件...")
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = os.path.join(backup_dir, ts)
    total_files, total_bytes = 0, 0

    for bucket in STORAGE_BUCKETS:
        print(f"    📦 {bucket}...", end=" ", flush=True)
        try:
            # 列出所有文件
            req = urllib.request.Request(
                f"{SUPABASE_URL}/storage/v1/object/list/{bucket}",
                method="POST", headers=headers,
                data=json.dumps({"prefix": "", "limit": 10000, "offset": 0}).encode()
            )
            resp = urllib.request.urlopen(req, timeout=30)
            files = json.loads(resp.read())
        except Exception as e:
            print(f"❌ {str(e)[:60]}")
            continue

        if not isinstance(files, list) or len(files) == 0:
            print("(empty)"); continue

        bucket_dir = os.path.join(base, bucket)
        os.makedirs(bucket_dir, exist_ok=True)
        count, size = 0, 0

        for f in files:
            name = f.get("name", "")
            meta = f.get("metadata") or {}
            fsize = int(meta.get("size", 0) or 0)
            if not name:
                continue
            # 下载文件
            dl_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{name}"
            if bucket == "sme-raw-backup":
                dl_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{name}"

            try:
                dl = urllib.request.urlopen(dl_url, timeout=30)
                fpath = os.path.join(bucket_dir, name.replace("/", "_"))
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, "wb") as fp:
                    fp.write(dl.read())
                count += 1; size += fsize
            except Exception as e:
                pass  # 跳过失败的文件

        print(f"{count} 个文件, {size/1024:.0f}KB")
        total_files += count; total_bytes += size

    manifest = {"backup_at": datetime.now().isoformat(), "buckets": STORAGE_BUCKETS, "files": total_files, "bytes": total_bytes}
    with open(os.path.join(base, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  ✅ Storage 备份: {base} ({total_files} 个文件, {total_bytes/1024/1024:.1f}MB)")
    return base


# ─────────── 代码备份 ───────────

def backup_code(backup_dir: str) -> str:
    print("  📁 备份代码仓库...")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(backup_dir, exist_ok=True)

    bundle_path = os.path.join(backup_dir, f"code_{ts}.bundle")
    result = subprocess.run(
        ["git", "bundle", "create", bundle_path, "--all"],
        cwd=PROJECT_DIR, capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        print(f"    ❌ git bundle 失败: {result.stderr[:100]}")
        return ""
    mb = os.path.getsize(bundle_path) / 1024 / 1024
    print(f"  ✅ 代码备份: {bundle_path} ({mb:.1f}MB)")
    return bundle_path


# ─────────── 清理旧备份 ───────────

def cleanup(backup_dir: str, retention_days: int, prefix: str):
    cutoff = datetime.now().timestamp() - retention_days * 86400
    deleted = 0
    for f in os.listdir(backup_dir):
        fpath = os.path.join(backup_dir, f)
        if os.path.isfile(fpath) and f.startswith(prefix):
            if os.path.getmtime(fpath) < cutoff:
                os.remove(fpath); deleted += 1
    if deleted:
        print(f"    🗑️  清理了 {deleted} 个旧备份 (>={retention_days}天)")


# ─────────── 主流程 ───────────

def main():
    parser = argparse.ArgumentParser(description="IGMaster 完整备份")
    parser.add_argument("--dir", default=os.path.expanduser("~/backups"),
                        help="备份根目录 (默认: ~/backups)")
    parser.add_argument("--type", choices=["all", "db", "storage", "code"], default="all")
    args = parser.parse_args()

    base = args.dir
    results = {}

    sep = "=" * 50
    print(sep)
    print(f"  IGMaster 备份 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(sep)
    print()

    if args.type in ("all", "db"):
        print("[数据库]")
        p = backup_db(os.path.join(base, "db"))
        cleanup(os.path.join(base, "db"), RETENTION_DAYS["db"], "db_")
        results["db"] = p
        print()

    if args.type in ("all", "storage"):
        print("[Storage 文件]")
        p = backup_storage(os.path.join(base, "storage"))
        # Storage 按目录结构，清理旧的 ts 目录
        storage_dir = os.path.join(base, "storage")
        if os.path.isdir(storage_dir):
            dirs = sorted(os.listdir(storage_dir))
            keep = 2  # 保留最近 2 份
            for d in dirs[:-keep]:
                import shutil
                shutil.rmtree(os.path.join(storage_dir, d), ignore_errors=True)
        results["storage"] = p
        print()

    if args.type in ("all", "code"):
        print("[代码]")
        p = backup_code(os.path.join(base, "code"))
        cleanup(os.path.join(base, "code"), RETENTION_DAYS["code"], "code_")
        results["code"] = p
        print()

    sub_sep = "= " * 25
    print(sub_sep)
    for k, v in results.items():
        status = "✅" if v else "❌"
        print(f"  {status} {k}: {v or '失败'}")
    print(sub_sep)

    # 磁盘使用统计
    import shutil
    total_usage = shutil.disk_usage(base) if os.path.isdir(base) else None
    if total_usage:
        free_gb = total_usage.free / 1024**3
        print(f"  💾 备份目录剩余空间: {free_gb:.1f}GB")


if __name__ == "__main__":
    main()
