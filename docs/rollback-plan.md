# IGMaster 回滚方案

## 一、代码回滚

### 场景：某次推送上线后网站报错

**步骤：**
```bash
# 1. 查看最近的提交历史
git log --oneline -10

# 2. 回滚到上一个稳定版本（生成新的反提交，不会丢失历史）
git revert HEAD

# 3. 推送到部署分支
# main（Vercel）:
git push origin main
# production（Zeabur）: 先合并到 production 或直接推
git checkout production
git revert HEAD  # 如果 production 也有问题
git push origin production
```

**回滚后：** Vercel / Zeabur 自动重新部署。

### 完全恢复到某个旧版本
```bash
# 查看所有 tag
git tag -l

# 如果有 tag，直接 checkout
git checkout v1.0

# 或恢复到某次 commit
git checkout <commit-hash>
```

### 建议
- 每次大功能上线前打 tag：`git tag v1.1 -m "某个功能"`
- 这样回滚可以直接 `git revert <tag>`

---

## 二、数据库回滚

### 场景：数据被误删/改错

**前提：** 备份脚本每天凌晨 3:00 自动运行，备份文件在 `~/backups/db/`。

**恢复步骤：**
```bash
# 1. 找到最近的备份
ls -lt ~/backups/db/

# 2. 解压查看
gunzip -c ~/backups/db/db_20260603_*.json.gz > /tmp/restore.json

# 3. 找到需要恢复的表的数据
python3 -c "
import json
with open('/tmp/restore.json') as f:
    data = json.load(f)
# 打印表的行数
for table, rows in data['tables'].items():
    print(f'{table}: {len(rows)}行')
"

# 4. 恢复单个表（通过 Supabase REST API）
# 先用备份数据覆盖对应表
python3 scripts/restore_table.py --table purchases --backup ~/backups/db/db_20260603_*.json.gz
```

### 全库恢复（灾难级）
```bash
# 1. 找最新备份
LATEST=$(ls -t ~/backups/db/db_*.json.gz | head -1)

# 2. 逐表恢复（先删后插）
python3 -c "
import json, gzip, urllib.request

with gzip.open('$LATEST') as f:
    data = json.loads(f.read())

SRV_KEY = '...'  # 从 ~/igcse-revision/scripts/backup_all.py 获取
URL = 'https://aondldqwwvttwpervrfq.supabase.co'
HEADERS = {'apikey': SRV_KEY, 'Authorization': f'Bearer {SRV_KEY}',
           'Content-Type': 'application/json'}

# 按依赖顺序恢复
TABLES = ['exam_boards', 'subjects', 'topics', 'subtopics', 'questions',
          'notes', 'past_papers', 'purchases', 'profiles', 'error_reports',
          'login_events', 'user_roles', 'app_config',
          'mock_exam_sets', 'mock_exam_papers', 'mock_exam_questions']

for t in TABLES:
    rows = data['tables'].get(t, [])
    if not rows: continue
    # 先删除现有数据
    req = urllib.request.Request(f'{URL}/rest/v1/{t}',
        method='DELETE', headers=HEADERS)
    urllib.request.urlopen(req)
    # 再插入备份数据
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        req = urllib.request.Request(f'{URL}/rest/v1/{t}',
            method='POST', headers=HEADERS,
            data=json.dumps(batch).encode())
        urllib.request.urlopen(req)
    print(f'恢复 {t}: {len(rows)}行')
"
```

---

## 三、域名切换

### 场景：Zeabur 宕机，需临时切换到 Vercel

**前置条件：** Vercel (`main` 分支) 保持与 Zeabur (`production` 分支) 内容同步。

**切换步骤：**
1. 登录阿里云 DNS 控制台 → https://dns.console.aliyun.com
2. 找到 `igmaster.org` 域名
3. 修改 CNAME 记录：
   - 当前：`@ → igmaster.zeabur.app`
   - 改为：`@ → igcse-revision.vercel.app` 或其他可用域名
4. DNS 生效时间：通常 1-10 分钟

**回切：** 等 Zeabur 恢复后，把 CNAME 改回去。

### 需要先做的准备
- Vercel 也要绑 `igmaster.org` 域名（现在只有 Zeabur 绑了）
- 这样 DNS 切换时 Vercel 能直接接管

---

## 四、数据丢失恢复（最坏情况）

### 恢复顺序
1. **恢复数据库** — 从 `~/backups/db/` 拉最新备份
2. **恢复 Storage 文件** — 从 `~/backups/storage/` 重新上传 PDF
3. **恢复代码** — 从 GitHub 或 `~/backups/code/` 拉取
4. **设置环境变量** — 参考下文环境变量清单

### 应急联系人
- 服务器：我这台 Hermes Agent 服务器（自动备份在这台机器上）
- GitHub：`chenchenzhang569-bit/igcse-revision`
- Zeabur：`igcse-revision` 项目
- Vercel：`igcse-revision` 项目
