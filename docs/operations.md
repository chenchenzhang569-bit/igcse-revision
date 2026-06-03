# 运维手册

---

## 1. 日常检查

### 网站可用性

```bash
# 检查 Vercel 部署状态
curl -sI https://igcse-revision.vercel.app | head -5

# 检查 Zeabur 生产环境
curl -sI https://igmaster.org | head -5

# 检查 Supabase 连通性
curl -sI https://aondldqwwvttwpervrfq.supabase.co/rest/v1/
```

### 备份检查

```bash
# 检查最近备份
ls -lt ~/backups/db/ | head -5
ls -lt ~/backups/code/ | head -5

# 检查备份大小
du -sh ~/backups/
```

---

## 2. 备份方案

### 自动备份

| 频率 | 时间 | 内容 | 脚本 |
|:-----|:-----|:-----|:-----|
| 每天 | 03:00 | 数据库（16 表 + Auth 用户） | `backup_all.py --type db` |
| 每周 | 周日 04:00 | 全部（DB + Storage + 代码） | `backup_all.py` |

备份位置：
```
~/backups/
├── db/          # 数据库 .json.gz（保留 30 天）
├── storage/     # Storage 文件（保留 2 份）
└── code/        # git bundle（保留 7 天）
```

### 手动备份

```bash
cd ~/igcse-revision
python3 scripts/backup_all.py              # 完整备份
python3 scripts/backup_all.py --type db     # 仅数据库
python3 scripts/backup_all.py --type code   # 仅代码
```

---

## 3. 日志查看

### 备份日志

```bash
tail -50 ~/backups/db/daily.log
tail -50 ~/backups/full/weekly.log
```

### 定时任务

```bash
crontab -l  # 查看所有定时任务
```

### 部署日志

- Vercel: https://vercel.com → 项目 → Deployments
- Zeabur: https://zeabur.com → 项目 → 部署日志

---

## 4. 数据库操作

### 数据查询（紧急情况用 service_role key）

```python
# 通过 REST API 查询
URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "..."  # SUPABASE_SERVICE_ROLE_KEY
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# 例：查询某用户
curl $URL/rest/v1/profiles?select=* -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

### 数据恢复

从备份文件恢复数据：

```bash
# 1. 找到最新备份
ls -lt ~/backups/db/db_*.json.gz | head -1

# 2. 解压查看内容
gunzip -c ~/backups/db/最新文件.json.gz | python3 -c "
import json,sys
data = json.load(sys.stdin)
for t, rows in data['tables'].items():
    print(f'{t}: {len(rows)}行')
"

# 3. 逐表通过 REST API 恢复（参照 docs/rollback-plan.md）
```

---

## 5. 监控建议

### 当前状态

- ✅ **数据库备份** — 自动运行中（每日 03:00）
- ✅ **代码备份** — 自动运行中（每周日）
- ❌ **健康检查** — 未配置（建议设置每月一次 URL 可访问性检查）
- ❌ **磁盘监控** — 未配置（备份目录 10.2GB 剩余空间）

### 建议增加的监控

1. **网站健康检查** — 每月手动访问 https://igmaster.org 确认可用
2. **备份验证** — 每月检查 `~/backups/` 目录有最新备份文件
3. **磁盘空间** — 确保 `~/backups/` 所在分区有足够空间

---

## 6. 常见问题

### 部署失败

**现象:** Vercel/Zeabur 构建失败  
**排查:**
1. 检查是否是 `useSearchParams()` 缺少 Suspense 包裹
2. 检查环境变量是否完整
3. 查看构建日志中的具体错误

### 国内访问慢

**现状:** Zeabur 香港节点 → Supabase 美国 延迟约 0.04s–0.22s  
**优化方向:** 后续可迁移数据库到阿里云 RDS（需 ICP 备案）

### 邮箱验证链接打不开

**原因:** Supabase Auth 发送的确认链接需要 `/auth/callback` 路由正确处理 `token_hash`  
**检查:** `src/app/auth/callback/page.tsx` 中是否正确处理 `verifyOtp`

### 备份磁盘空间不足

**自动清理:** 数据库备份保留 30 天，代码备份保留 7 天，Storage 保留 2 份  
**手动清理:** 删除旧备份 `rm ~/backups/db/db_旧日期*.json.gz`

---

## 7. Supabase 面板访问

| 功能 | 路径 |
|:-----|:-----|
| SQL 查询 | Dashboard → SQL Editor |
| 表数据 | Dashboard → Table Editor |
| RLS 策略 | Dashboard → Authentication → Policies |
| 存储桶管理 | Dashboard → Storage |
| API 密钥 | Dashboard → Project Settings → API |
| 数据库设置 | Dashboard → Project Settings → Database |
| Auth 用户 | Dashboard → Authentication → Users |
| Auth 设置 | Dashboard → Authentication → Settings |
