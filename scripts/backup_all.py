#!/usr/bin/env python3
"""
IGMaster 完整备份脚本
每周日运行：数据库 + R2 文件 + 代码仓库

用法:
  python3 scripts/backup_all.py                        # 备份全部
  python3 scripts/backup_all.py --type db              # 仅数据库
  python3 scripts/backup_all.py --type storage         # 仅 R2
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
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmRsZHF3d3Z0dHdwZXJ2cmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI2NDM4MSwiZXhwIjoyMDkzODQwMzgxfQ.OYuqkYVvPuU02cKDntfTWiqZwkzY0dceO0DMTOA4U88"
PROJECT_DIR = os.path.expanduser("~/igcse-revision")

R2_CONFIG = {
    "endpoint_url": "https://7524670a3d7d50fd979765dedb5b378d.r2.cloudflarestorage.com",
    "aws_access_key_id": "baf9fd99dfe0501ceb0f8da65bccfbfc",
    "aws_secret_access_key": "a53c8d8f542bdcf7049f9281ce987680208387ad0d56a20ddbba57881b144b80",
}
R2_BUCKETS = ["past-papers", "notes-pdfs", "sme-images"]
R2_MIRROR_DIR = os.path.expanduser("~/backups/r2-mirror")

# 所有表（按外键依赖排序）
TABLES = [
    "exam_boards", "subjects", "topics", "subtopics",
    "questions", "notes", "past_papers",
    "purchases", "profiles", "error_reports", "login_events",
    "user_roles", "app_config",
    "mock_exam_sets", "mock_exam_papers", "mock_exam_questions",
    "mock_exams", "user_answers", "user_bookmarks", "user_bans",
    "user_security_log",
]

PAGE_SIZE = 1000
RETENTION_DAYS = {
    "db": 30,       # 数据库备份保留30天
    "r2": 7,        # R2 归档保留7天（本地 mirror 永久保留，archive 只是快照）
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


# ─────────── R2 文件备份 ───────────

def backup_r2(backup_dir: str) -> str:
    print("  📡 同步 R2 文件（增量的，首次 ~8.6GB，后续仅变更）...")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    stats = {}

    # 用 aws s3 sync 增量同步到本地 mirror
    for bucket in R2_BUCKETS:
        mirror_path = os.path.join(R2_MIRROR_DIR, bucket)
        os.makedirs(mirror_path, exist_ok=True)
        print(f"    📦 {bucket}...", end=" ", flush=True)

        # 配置 aws profile（每次运行确保存在）
        profile_name = "r2-backup"
        env = os.environ.copy()
        env["AWS_ACCESS_KEY_ID"] = R2_CONFIG["aws_access_key_id"]
        env["AWS_SECRET_ACCESS_KEY"] = R2_CONFIG["aws_secret_access_key"]
        env["AWS_DEFAULT_REGION"] = "auto"

        result = subprocess.run(
            ["aws", "s3", "sync",
             f"s3://{bucket}/", f"{mirror_path}/",
             "--endpoint-url", R2_CONFIG["endpoint_url"],
             "--no-progress"],
            capture_output=True, text=True, timeout=600,
            env=env,
        )

        # 统计结果
        out = result.stdout + result.stderr
        # 解析 aws s3 sync 输出
        downloaded = out.count("download: s3://")
        deleted = out.count("delete: s3://")
        failed = result.returncode != 0
        stats[bucket] = {"downloaded": downloaded, "deleted": deleted, "failed": failed}
        print(f"↓{downloaded} →{deleted}" + (" ⚠️ 有错误" if failed else " ✅"))

    # 统计 mirror 目录大小
    total_size = 0
    for bucket in R2_BUCKETS:
        mirror_path = os.path.join(R2_MIRROR_DIR, bucket)
        if os.path.isdir(mirror_path):
            for dirpath, _, filenames in os.walk(mirror_path):
                for fn in filenames:
                    fp = os.path.join(dirpath, fn)
                    try:
                        total_size += os.path.getsize(fp)
                    except OSError:
                        pass

    print(f"  📊 R2 mirror 总大小: {total_size/1024/1024:.0f} MB")

    # 创建归档（从 mirror 打包，跳过超大 past paper 目录以节省空间）
    # 归档仅包含：igcse/ znotes/ + notes-pdfs + sme-images
    archive_dir = os.path.join(backup_dir, ts)
    os.makedirs(archive_dir, exist_ok=True)

    manifest = {
        "backup_at": datetime.now().isoformat(),
        "mirror_dir": R2_MIRROR_DIR,
        "mirror_size_mb": round(total_size / 1024 / 1024, 1),
        "sync_stats": stats,
    }

    # 从 mirror 复制关键数据到归档目录
    import shutil

    # 1. notes-pdfs
    notes_src = os.path.join(R2_MIRROR_DIR, "notes-pdfs")
    notes_dst = os.path.join(archive_dir, "notes-pdfs")
    if os.path.isdir(notes_src):
        shutil.copytree(notes_src, notes_dst)
        print(f"    📄 notes-pdfs: 已归档")

    # 2. sme-images
    sme_src = os.path.join(R2_MIRROR_DIR, "sme-images")
    sme_dst = os.path.join(archive_dir, "sme-images")
    if os.path.isdir(sme_src):
        shutil.copytree(sme_src, sme_dst)
        print(f"    🖼️  sme-images: 已归档")

    # 3. past-papers 中的 igcse/ 和 znotes/（数据文件，不含可恢复的大 PDF）
    pp_src = os.path.join(R2_MIRROR_DIR, "past-papers")
    for sub in ["igcse", "znotes"]:
        sub_src = os.path.join(pp_src, sub)
        sub_dst = os.path.join(archive_dir, "past-papers", sub)
        if os.path.isdir(sub_src):
            shutil.copytree(sub_src, sub_dst)
            print(f"    📁 past-papers/{sub}: 已归档")

    with open(os.path.join(archive_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    # 清理旧归档（保留最近 2 份）
    if os.path.isdir(backup_dir):
        dirs = sorted(os.listdir(backup_dir))
        keep = 2
        for d in dirs[:-keep]:
            dpath = os.path.join(backup_dir, d)
            if os.path.isdir(dpath) and d != ts:
                shutil.rmtree(dpath, ignore_errors=True)
                print(f"    🗑️  清理旧归档: {d}")

    archive_size = sum(
        os.path.getsize(os.path.join(dirpath, fn))
        for dirpath, _, filenames in os.walk(archive_dir)
        for fn in filenames
    ) / 1024 / 1024

    print(f"  ✅ R2 归档完成: {archive_dir} ({archive_size:.0f} MB)")
    return archive_dir


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
        print("[R2 文件]")
        p = backup_r2(os.path.join(base, "r2"))
        results["r2"] = p
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
