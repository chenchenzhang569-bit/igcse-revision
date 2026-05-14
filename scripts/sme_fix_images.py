"""
SME Physics Missing Images Fixer
在 Windows 上运行: py sme_fix_images.py

功能:
1. 从 Supabase 拉取 75 道缺图题目
2. 按 subtopic+difficulty 分组
3. 生成 SME 页面 URL，方便手动截图
4. (可选) 用 Selenium 自动截图——需先 pip install selenium
"""
import urllib.request
import json
import re
import os
import time
import shutil

# ===== CONFIG =====
URL = "https://aondldqwwvttwpervrfq.supabase.co"
KEY = "sb_publishable_m64KijPCmhkIDD1J0RV_kw_uCVbl6pL"
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# SME Physics topic question base URLs
SME_BASE = "https://www.savemyexams.com/igcse/physics/cie/23/topic-questions"

# Subtopic slug mapping (SME URL format)
TOPIC_SLUGS = {
    "1.1": "1-motion-forces-and-energy/1-1-physical-quantities-and-measurement-techniques",
    "1.2": "1-motion-forces-and-energy/1-2-motion",
    "1.3": "1-motion-forces-and-energy/1-3-mass-and-weight",
    "1.4": "1-motion-forces-and-energy/1-4-density",
    "1.5": "1-motion-forces-and-energy/1-5-forces",
    "1.6": "1-motion-forces-and-energy/1-6-momentum",
    "1.7": "1-motion-forces-and-energy/1-7-energy-work-and-power",
    "1.8": "1-motion-forces-and-energy/1-8-pressure",
    "2.1": "2-thermal-physics/2-1-kinetic-particle-model-of-matter",
    "2.2": "2-thermal-physics/2-2-thermal-properties-and-temperature",
    "2.3": "2-thermal-physics/2-3-transfer-of-thermal-energy",
    "3.1": "3-waves/3-1-general-properties-of-waves",
    "3.2": "3-waves/3-2-light",
    "3.3": "3-waves/3-3-electromagnetic-spectrum",
    "3.4": "3-waves/3-4-sound",
    "4.1": "4-electricity-and-magnetism/4-1-simple-phenomena-of-magnetism",
    "4.2": "4-electricity-and-magnetism/4-2-electrical-quantities",
    "4.3": "4-electricity-and-magnetism/4-3-electric-circuits",
    "4.4": "4-electricity-and-magnetism/4-4-electrical-safety",
    "4.5": "4-electricity-and-magnetism/4-5-electromagnetic-effects",
    "5.1": "5-nuclear-physics/5-1-the-nuclear-model-of-the-atom",
    "5.2": "5-nuclear-physics/5-2-radioactivity",
    "6.1": "6-space-physics/6-1-earth-and-the-solar-system",
    "6.2": "6-space-physics/6-2-stars-and-the-universe",
}

# ===== 1. Fetch missing questions =====
def fetch_all(table, filters=""):
    results = []
    offset = 0
    limit = 500
    while True:
        params = f"select=*&limit={limit}&offset={offset}"
        if filters:
            params += f"&{filters}"
        req = urllib.request.Request(f"{URL}/rest/v1/{table}?{params}", headers=HEADERS)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            if not data: break
            results.extend(data)
            offset += limit
            if len(data) < limit: break
        except Exception as e:
            print(f"Error: {e}"); break
    return results

print("Fetching Physics data...")
subjects = fetch_all("subjects", "select=id,code&code=eq.0625")
phys_id = subjects[0]['id']
topics = fetch_all("topics", f"select=id,name&subject_id=eq.{phys_id}")
topic_map = {t['id']: t['name'] for t in topics}
tids = ','.join(topic_map.keys())
subtopics = fetch_all("subtopics", f"select=id,pmt_code,name,topic_id&topic_id=in.({tids})")
sub_map = {s['id']: s for s in subtopics}

# Fetch ALL Physics questions
questions = fetch_all("questions", f"topic_id=in.({tids})&limit=500&offset=0&select=id,question_text,options,subtopic_id,difficulty,correct_answer")

# Find missing images
def options_empty(opts):
    if not opts: return True
    if isinstance(opts, list):
        return all(str(o).strip() in ['A.', 'B.', 'C.', 'D.', ''] for o in opts)
    try:
        p = json.loads(opts)
        return all(str(o).strip() in ['A.', 'B.', 'C.', 'D.', ''] for o in p)
    except:
        return False

triggers = ['shown below', 'the diagram', 'diagram below', 'as shown in']
missing = []
for q in questions:
    txt = q.get('question_text', '')
    if '![' in txt: continue
    if not any(t in txt.lower() for t in triggers): continue
    sub = sub_map.get(q['subtopic_id'], {})
    code = sub.get('pmt_code', '?')
    broken = options_empty(q.get('options'))
    missing.append({
        'id': q['id'],
        'code': code,
        'difficulty': q.get('difficulty', '?'),
        'text': txt[:200],
        'broken': broken,
    })

print(f"\nTotal missing: {len(missing)} ({sum(1 for m in missing if m['broken'])} broken)\n")

# Group by code + difficulty
from collections import defaultdict
groups = defaultdict(list)
for m in missing:
    groups[(m['code'], m['difficulty'])].append(m)

# Print checklist
print("=" * 70)
print("HANDY CHECKLIST - 打开对应 SME 页面截图")
print("=" * 70)

for (code, diff), items in sorted(groups.items()):
    slug = TOPIC_SLUGS.get(code, '')
    url = f"{SME_BASE}/{slug}/{diff}/" if slug else "???"
    broken_n = sum(1 for i in items if i['broken'])
    print(f"\n📎 {code} [{diff}] - {len(items)} 题 ({broken_n} broken)")
    print(f"   {url}")
    for i, m in enumerate(items):
        marker = "🔴" if m['broken'] else "⚠️"
        print(f"   {marker} Q{i+1}: {m['text'][:100]}...")

# ===== 2. Optional: Selenium auto-screenshot =====
USE_SELENIUM = False  # Set to True after pip install selenium

if USE_SELENIUM:
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
    except ImportError:
        print("\n❌ Selenium not installed. Run: pip install selenium")
        exit()

    print("\n\n=== Starting Selenium Auto-Screenshot ===\n")
    print("⚠️  YOU MUST LOG IN TO SME MANUALLY in the browser window.")
    print("    After login, press Enter here to continue...")
    input()

    driver = webdriver.Chrome()
    screenshot_dir = "sme_screenshots"
    os.makedirs(screenshot_dir, exist_ok=True)

    for (code, diff), items in sorted(groups.items()):
        slug = TOPIC_SLUGS.get(code, '')
        if not slug: continue
        url = f"{SME_BASE}/{slug}/{diff}/"
        print(f"\nOpening: {url}")
        driver.get(url)
        time.sleep(3)  # Wait for JS to load questions
        
        # Scroll and find questions
        # This part depends on SME's actual DOM structure
        # You may need to adjust selectors
        
        for i, m in enumerate(items):
            try:
                # Find question by text content
                # SME renders questions in .question-card or similar
                q_cards = driver.find_elements(By.CSS_SELECTOR, '[class*="question"]')
                for card in q_cards:
                    if m['text'][:50] in card.text:
                        filename = f"{code.replace('.','_')}_{diff}_{i+1}.png"
                        filepath = os.path.join(screenshot_dir, filename)
                        card.screenshot(filepath)
                        print(f"  ✅ Saved: {filename}")
                        break
            except Exception as e:
                print(f"  ❌ Error Q{i+1}: {e}")

    driver.quit()
    print(f"\n✅ Done! Screenshots saved to {screenshot_dir}/")

else:
    print("\n" + "=" * 70)
    print("如需自动截图，编辑此脚本设置 USE_SELENIUM = True")
    print("然后: pip install selenium")
    print("=" * 70)
