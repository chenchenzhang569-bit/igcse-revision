"""
ZNotes Mathematics 0580 Subtopic Scraper (Title Matching)
==========================================================
Uses Playwright to log into ZNotes, scrape each subtopic page, and save as PDF.
Matches subtopics by page title against our display names.

Usage:
    py scripts/znotes_scrape_subtopics.py

Output:
    ./znotes_pdfs/  — one PDF per subtopic, named "1.1 Types of Number.pdf" etc.
"""

import time
import json
import re
from pathlib import Path
from difflib import SequenceMatcher

# --- Config ---
ZNOTES_EMAIL = "beryl_zhong@hotmail.com"
ZNOTES_PASSWORD = "Loving7925%"
THEORY_URL = "https://znotes.org/caie/igcse/mathematics-0580/theory"
OUTPUT_DIR = Path("./znotes_pdfs")

# Our subtopics: list of (pmtCode, displayName)
OUR_SUBTOPICS = [
    ("1.1", "Types of Number"),
    ("1.2", "Fractions & Decimals"),
    ("1.3", "Percentages"),
    ("1.4", "Ratio & Proportion"),
    ("1.5", "Standard Form"),
    ("1.6", "Estimation & Bounds"),
    ("2.1", "Algebraic Expressions"),
    ("2.2", "Equations"),
    ("2.3", "Inequalities"),
    ("2.4", "Sequences"),
    ("2.5", "Graphs of Functions"),
    ("3.1", "Straight Line Graphs"),
    ("4.1", "Angles"),
    ("4.2", "Polygons"),
    ("4.3", "Circles"),
    ("4.4", "Constructions"),
    ("4.5", "Symmetry"),
    ("4.6", "Similarity & Congruence"),
    ("5.1", "Area"),
    ("5.2", "Volume & Surface Area"),
    ("6.1", "Right-Angled Triangles"),
    ("6.2", "Sine & Cosine Rule"),
    ("6.3", "Trigonometric Graphs"),
    ("7.1", "Vectors"),
    ("7.2", "Transformations"),
    ("8.1", "Basic Probability"),
    ("8.2", "Tree Diagrams"),
    ("8.3", "Conditional Probability"),
    ("9.1", "Data Collection"),
    ("9.2", "Averages & Spread"),
    ("9.3", "Charts & Diagrams"),
    ("9.4", "Cumulative Frequency"),
    ("9.5", "Scatter Graphs & Correlation"),
]

def clean_title(s: str) -> str:
    """Normalize a title for fuzzy matching."""
    s = s.lower().strip()
    # Remove leading numbers like "1.1 " or "1.1: "
    s = re.sub(r'^\d+\.\d+\s*[:.\-–—]\s*', '', s)
    s = re.sub(r'^\d+\.?\s*', '', s)
    # Normalize spaces and remove special chars
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def fuzzy_match(znotes_title: str) -> tuple:
    """Match a ZNotes page title against our subtopics. Returns (pmtCode, displayName) or (None, None)."""
    clean = clean_title(znotes_title)
    best_score = 0
    best_match = (None, None)

    for pmt, name in OUR_SUBTOPICS:
        our_clean = clean_title(name)
        score = SequenceMatcher(None, clean, our_clean).ratio()
        if score > best_score:
            best_score = score
            best_match = (pmt, name)

    if best_score >= 0.6:
        return best_match
    return (None, None)

def main():
    from playwright.sync_api import sync_playwright

    OUTPUT_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=2,
        )
        page = context.new_page()

        try:
            # === Step 1: Login ===
            print("🔐 Navigating to ZNotes login...")
            page.goto("https://znotes.org/login", timeout=30000)
            time.sleep(2)

            page.fill('input[type="email"]', ZNOTES_EMAIL)
            page.fill('input[type="password"]', ZNOTES_PASSWORD)
            print("📧 Filled credentials, clicking login...")

            page.click('button[type="submit"]')
            time.sleep(5)

            if "login" in page.url.lower():
                print("❌ Login may have failed. Complete any CAPTCHA manually.")
                input("Press Enter after manually logging in (or Ctrl+C to abort)...")

            print("✅ Logged in!")

            # === Step 2: Go to Theory page, extract subtopic links ===
            print(f"\n📚 Loading theory page: {THEORY_URL}")
            page.goto(THEORY_URL, timeout=30000)
            time.sleep(5)

            links = page.locator('a[href*="/theory/"]').all()
            subtopic_urls = []
            seen = set()

            for link in links:
                href = link.get_attribute("href")
                if href and "/theory/" in href and href not in seen:
                    if href.rstrip("/").endswith("/theory"):
                        continue
                    seen.add(href)
                    full_url = f"https://znotes.org{href}" if href.startswith("/") else href
                    subtopic_urls.append(full_url)
                    print(f"  Found: {full_url}")

            print(f"\n📋 Found {len(subtopic_urls)} subtopic pages")

            # === Step 3: Visit each page, match title, save PDF ===
            success = 0
            unmatched = []
            failed = 0

            for i, url in enumerate(subtopic_urls):
                print(f"\n[{i+1}/{len(subtopic_urls)}] {url}")

                try:
                    page.goto(url, timeout=30000)
                    time.sleep(4)

                    # Extract page title from h1
                    title = ""
                    try:
                        h1 = page.locator("h1").first
                        if h1.count() > 0:
                            title = h1.inner_text().strip()
                        if not title:
                            title = page.title()
                    except:
                        title = page.title()

                    print(f"    Title: {title}")

                    pmt_code, display_name = fuzzy_match(title)

                    if pmt_code is None:
                        print(f"    ⚠️  No match for: '{title}' — saving for manual review")
                        unmatched.append({"url": url, "title": title})
                        # Save with raw title anyway
                        safe_name = re.sub(r'[<>:"/\\|?*]', '_', title)
                        filepath = OUTPUT_DIR / f"_unmatched_{safe_name}.pdf"
                    else:
                        filename = f"{pmt_code} {display_name}.pdf"
                        filepath = OUTPUT_DIR / filename

                    if filepath.exists() and not filepath.name.startswith("_unmatched_"):
                        print(f"    ⏭️  Already exists, skipping")
                        continue

                    page.pdf(
                        path=str(filepath),
                        format="A4",
                        print_background=True,
                        margin={"top": "10mm", "bottom": "10mm", "left": "15mm", "right": "15mm"},
                    )

                    file_size = filepath.stat().st_size
                    print(f"    ✅ Saved: {filepath.name} ({file_size:,} bytes)")
                    success += 1

                except Exception as e:
                    print(f"    ❌ Failed: {e}")
                    failed += 1

                time.sleep(1)

            # === Summary ===
            print(f"\n{'='*60}")
            print(f"📊 Success: {success}  Failed: {failed}  Unmatched: {len(unmatched)}")
            print(f"📁 Output: {OUTPUT_DIR.absolute()}")
            print(f"{'='*60}")

            if unmatched:
                print("\n⚠️  Unmatched pages (need manual mapping):")
                for u in unmatched:
                    print(f"    Title: '{u['title']}'  URL: {u['url']}")
                (OUTPUT_DIR / "_unmatched.json").write_text(
                    json.dumps(unmatched, indent=2, ensure_ascii=False)
                )

        finally:
            print("\n🔒 Closing browser in 3 seconds...")
            time.sleep(3)
            browser.close()

if __name__ == "__main__":
    main()
