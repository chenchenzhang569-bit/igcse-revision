"""
SME Option Fixer — Run on your Windows machine
===============================================
Fixes 257 MCQ questions whose options are empty in the database
by scraping the original option content from savemyexams.co.uk.

Requirements:
    pip install httpx beautifulsoup4 supabase

Usage:
    py sme_fixer.py

What it does:
    1. Fetches all 257 problem questions from Supabase
    2. For each, searches savemyexams.co.uk for the question
    3. Extracts the option content (HTML → plain text)
    4. Updates the question in Supabase with proper options
"""

import asyncio
import json
import re
import time
from urllib.parse import quote

try:
    import httpx
    from bs4 import BeautifulSoup
except ImportError:
    print("Please install: pip install httpx beautifulsoup4")
    exit(1)

# --- Config ---
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SUPABASE_KEY = ""  # read-only
# For writes, paste your service_role key here (from .env.local)
SUPABASE_SERVICE_KEY = "PASTE_YOUR_SERVICE_ROLE_KEY_HERE"

# ------------------------------------------------------------

async def get_problem_questions():
    """Fetch questions with empty options from Supabase."""
    all_qs = []
    async with httpx.AsyncClient(timeout=30) as client:
        for offset in range(0, 2000, 1000):
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/questions",
                params={
                    "select": "id,question_text,answer_text,correct_answer,subject_id",
                    "limit": 1000,
                    "offset": offset,
                },
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            )
            data = resp.json()
            if not data:
                break
            all_qs.extend(data)
    
    # Filter: questions with empty ABCD options but no diagram/table ref
    empty = []
    for q in all_qs:
        text = q.get("question_text", "") or ""
        if not re.search(r"[A-D][.)\s:)]", text):
            continue
        lines = text.split("\n")
        has_empty = False
        for line in lines:
            m = re.match(r"^([A-D])[.)\s:)]\s*(.*)", line.strip())
            if m and (not m.group(2).strip() or len(m.group(2).strip()) <= 2):
                has_empty = True
                break
        if not has_empty:
            continue
        # Skip questions with diagram references
        stem = re.split(r"\n[A-D][.)\s:)]", text)[0]
        if re.search(r"diagram|graph|figure|shown|illustrat|picture|image|drawing", stem.lower()):
            continue
        if "![" in text and "](" in text:
            continue
        empty.append(q)
    
    return empty


async def search_sme(client, question_text, subject_name):
    """Search savemyexams.co.uk for a question and return the page HTML."""
    # Extract searchable keywords (first 80 chars of stem)
    stem = re.split(r"\n\s*[A-D][.)\s:)]", question_text)[0]
    # Clean: remove markdown formatting, keep alpha-numeric + spaces
    keywords = re.sub(r"[^a-zA-Z0-9\s]", " ", stem[:80])
    keywords = " ".join(keywords.split()[:12])
    
    if not keywords.strip():
        return None, None
    
    # Try SME search
    search_url = f"https://www.savemyexams.com/search/?q={quote(keywords)}"
    
    try:
        resp = await client.get(
            search_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
            follow_redirects=True,
        )
        if resp.status_code != 200:
            return None, None
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Find the first search result link
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            # Look for topic-questions or mcq links
            if "/topic-questions/" in href or "/mcq/" in href:
                # Check if the link text or nearby text matches our question
                link_text = a.get_text(strip=True).lower()
                if any(w in link_text for w in keywords.lower().split()[:4]):
                    return f"https://www.savemyexams.com{href}" if href.startswith("/") else href, keywords
        
        # Fallback: return first topic-questions result
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            if "/topic-questions/" in href:
                return f"https://www.savemyexams.com{href}" if href.startswith("/") else href, keywords
        
        return None, keywords
    except Exception as e:
        print(f"    Search error: {e}")
        return None, keywords


async def extract_options_from_page(client, page_url):
    """Extract MCQ options from an SME question page."""
    if not page_url:
        return None
    
    try:
        resp = await client.get(
            page_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
            follow_redirects=True,
        )
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, "html.parser")
        options = []
        
        # SME typically uses a specific HTML structure for options
        # Look for option containers with A/B/C/D labels
        # Common patterns:
        # 1. <div class="option"> or <div data-option="A">
        # 2. <label> or <li> with radio buttons
        # 3. Table rows with A/B/C/D in first column
        
        # Pattern 1: Look for elements with option letters
        for tag in soup.find_all(["div", "li", "label", "tr"]):
            text = tag.get_text(strip=True)
            m = re.match(r"^([A-D])[.)\s:)](.+)", text)
            if m:
                letter = m.group(1)
                content = m.group(2).strip()
                options.append((letter, content))
        
        # Pattern 2: Look for <td> with A/B/C/D in tables
        if not options:
            for table in soup.find_all("table"):
                for row in table.find_all("tr"):
                    cells = row.find_all(["td", "th"])
                    if cells:
                        first = cells[0].get_text(strip=True)
                        if re.match(r"^[A-D]$", first):
                            rest = " | ".join(c.get_text(strip=True) for c in cells[1:])
                            options.append((first, rest))
        
        # Deduplicate by letter
        seen = set()
        unique = []
        for letter, content in options:
            if letter not in seen and content.strip():
                seen.add(letter)
                unique.append(f"{letter}. {content}")
        
        return unique if unique else None
    except Exception as e:
        print(f"    Extract error: {e}")
        return None


async def update_question(question_id, options, subtopic_id):
    """Update the question in Supabase with proper options."""
    if not SUPABASE_SERVICE_KEY or "PASTE_YOUR" in SUPABASE_SERVICE_KEY:
        print("    ⚠️  Skipping update — service_role key not configured")
        return False
    
    async with httpx.AsyncClient(timeout=15) as client:
        payload = {"options": options}
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/questions?id=eq.{question_id}",
            json=payload,
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            },
        )
        return resp.status_code == 204


async def main():
    print("=== SME Option Fixer ===\n")
    
    # Check service key
    if not SUPABASE_SERVICE_KEY or "PASTE_YOUR" in SUPABASE_SERVICE_KEY:
        print("⚠️  IMPORTANT: Edit this script and paste your SUPABASE_SERVICE_ROLE_KEY")
        print("   from ~/igcse-site/.env.local into SUPABASE_SERVICE_KEY above.\n")
    
    print("1. Fetching problem questions from Supabase...")
    questions = await get_problem_questions()
    print(f"   Found {len(questions)} questions with empty options\n")
    
    if not questions:
        print("No problems found. Database is clean!")
        return
    
    print(f"2. Searching savemyexams.co.uk for each question...")
    print(f"   (This will take a while — ~2-3 seconds per question)\n")
    
    fixed = 0
    failed = 0
    search_fails = 0
    
    async with httpx.AsyncClient(timeout=30, http2=True) as client:
        for i, q in enumerate(questions):
            qid = q["id"][:12]
            text = q.get("question_text", "")[:80].replace("\n", " ")
            
            print(f"  [{i+1}/{len(questions)}] {qid}: {text}...")
            
            # Search
            page_url, keywords = await search_sme(client, q["question_text"], "")
            
            if not page_url:
                print(f"    ✗ Not found (keywords: {keywords})")
                search_fails += 1
                failed += 1
            else:
                print(f"    Found: {page_url[:80]}")
                
                # Extract options
                options = await extract_options_from_page(client, page_url)
                
                if options:
                    print(f"    ✓ Options: {options}")
                    ok = await update_question(q["id"], options, "")
                    if ok:
                        fixed += 1
                    else:
                        failed += 1
                else:
                    print(f"    ✗ Could not extract options")
                    failed += 1
            
            # Be nice to the server
            await asyncio.sleep(1.5)
    
    print(f"\n=== Done ===")
    print(f"Fixed:   {fixed}")
    print(f"Failed:  {failed}")
    print(f"  - Search fails: {search_fails}")
    print(f"  - Extract fails: {failed - search_fails}")
    
    if not SUPABASE_SERVICE_KEY or "PASTE_YOUR" in SUPABASE_SERVICE_KEY:
        print(f"\n⚠️  Updates were skipped (no service key).")
        print(f"   To actually fix the database: paste your service_role key and re-run.")


if __name__ == "__main__":
    asyncio.run(main())
