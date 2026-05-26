"""
ZNotes Mathematics 0580 Subtopic Scraper
========================================
Uses Playwright to log into ZNotes, scrape each subtopic page, and save as PDF.
Run on Windows machine with Chrome + Playwright installed.

Usage:
    py scripts/znotes_scrape_subtopics.py

Output:
    ./znotes_pdfs/  — one PDF per subtopic, named by our pmtCode (e.g., "1.1 Types of Number.pdf")
"""

import os
import sys
import time
import json
from pathlib import Path

# --- Config ---
ZNOTES_EMAIL = "beryl_zhong@hotmail.com"
ZNOTES_PASSWORD = "Loving7925%"
THEORY_URL = "https://znotes.org/caie/igcse/mathematics-0580/theory"
OUTPUT_DIR = Path("./znotes_pdfs")

# Our subtopic mapping: ZNotes slug -> (pmtCode, displayName)
# We'll discover ZNotes slugs dynamically, but this helps with naming
SUBTopic_MAP = {
    # Topic 1: Number
    "types-of-number":       ("1.1", "Types of Number"),
    "fractions-decimals":    ("1.2", "Fractions & Decimals"),
    "percentages":           ("1.3", "Percentages"),
    "ratio-proportion":      ("1.4", "Ratio & Proportion"),
    "standard-form":         ("1.5", "Standard Form"),
    "estimation":            ("1.6", "Estimation & Bounds"),
    # Topic 2: Algebra & Graphs
    "algebraic-expressions": ("2.1", "Algebraic Expressions"),
    "equations":             ("2.2", "Equations"),
    "inequalities":          ("2.3", "Inequalities"),
    "sequences":             ("2.4", "Sequences"),
    "graphs":                ("2.5", "Graphs of Functions"),
    # Topic 3: Coordinate Geometry
    "straight-line-graphs":  ("3.1", "Straight Line Graphs"),
    # Topic 4: Geometry
    "angles":                ("4.1", "Angles"),
    "polygons":              ("4.2", "Polygons"),
    "circles":               ("4.3", "Circles"),
    "constructions":         ("4.4", "Constructions"),
    "symmetry":              ("4.5", "Symmetry"),
    "similarity-congruence": ("4.6", "Similarity & Congruence"),
    # Topic 5: Mensuration
    "area":                  ("5.1", "Area"),
    "volume-surface-area":   ("5.2", "Volume & Surface Area"),
    # Topic 6: Trigonometry
    "right-triangles":       ("6.1", "Right-Angled Triangles"),
    "sine-cosine-rule":      ("6.2", "Sine & Cosine Rule"),
    "trig-graphs":           ("6.3", "Trigonometric Graphs"),
    # Topic 7: Vectors & Transformations
    "vectors":               ("7.1", "Vectors"),
    "transformations":       ("7.2", "Transformations"),
    # Topic 8: Probability
    "basic-probability":     ("8.1", "Basic Probability"),
    "tree-diagrams":         ("8.2", "Tree Diagrams"),
    "conditional-probability": ("8.3", "Conditional Probability"),
    # Topic 9: Statistics
    "data-collection":       ("9.1", "Data Collection"),
    "averages":              ("9.2", "Averages & Spread"),
    "charts":                ("9.3", "Charts & Diagrams"),
    "cumulative-frequency":  ("9.4", "Cumulative Frequency"),
    "scatter-graphs":        ("9.5", "Scatter Graphs & Correlation"),
}


def main():
    from playwright.sync_api import sync_playwright

    OUTPUT_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False so user can see login
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=2,  # high-res PDFs
        )
        page = context.new_page()

        try:
            # === Step 1: Login ===
            print("🔐 Navigating to ZNotes login...")
            page.goto("https://znotes.org/login", timeout=30000)
            time.sleep(2)

            # Fill login form
            page.fill('input[type="email"]', ZNOTES_EMAIL)
            page.fill('input[type="password"]', ZNOTES_PASSWORD)
            print("📧 Filled credentials, clicking login...")

            # Click login button
            page.click('button[type="submit"]')
            time.sleep(5)

            # Check login success
            if "login" in page.url.lower():
                print("❌ Login may have failed. Check credentials or complete any CAPTCHA.")
                print(f"   Current URL: {page.url}")
                input("Press Enter after manually logging in (or Ctrl+C to abort)...")

            print("✅ Logged in!")

            # === Step 2: Go to Theory page and extract subtopic links ===
            print(f"\n📚 Loading theory page: {THEORY_URL}")
            page.goto(THEORY_URL, timeout=30000)
            time.sleep(5)

            # Extract all subtopic links from the page
            # ZNotes subtopic links look like: /caie/igcse/mathematics-0580/theory/numbers/
            links = page.locator('a[href*="/theory/"]').all()
            subtopic_urls = []
            seen = set()

            for link in links:
                href = link.get_attribute("href")
                if href and "/theory/" in href and href not in seen:
                    # Skip the main theory page itself
                    if href.rstrip("/").endswith("/theory"):
                        continue
                    seen.add(href)
                    # Extract slug from URL: /caie/igcse/mathematics-0580/theory/numbers/ -> numbers
                    slug = href.rstrip("/").split("/")[-1]
                    full_url = f"https://znotes.org{href}" if href.startswith("/") else href
                    subtopic_urls.append((slug, full_url))
                    print(f"  Found: {slug} -> {full_url}")

            print(f"\n📋 Found {len(subtopic_urls)} subtopic pages")

            # === Step 3: Scrape each subtopic page and save as PDF ===
            success_count = 0
            skip_count = 0
            fail_count = 0

            for i, (slug, url) in enumerate(subtopic_urls):
                pmt_code, display_name = SUBTopic_MAP.get(slug, (None, None))

                if pmt_code is None:
                    print(f"\n[{i+1}/{len(subtopic_urls)}] ⚠️  Unknown slug: {slug} — skipping")
                    skip_count += 1
                    continue

                filename = f"{pmt_code} {display_name}.pdf"
                filepath = OUTPUT_DIR / filename

                if filepath.exists():
                    print(f"\n[{i+1}/{len(subtopic_urls)}] ⏭️  {filename} already exists, skipping")
                    skip_count += 1
                    continue

                print(f"\n[{i+1}/{len(subtopic_urls)}] 📄 {pmt_code} {display_name}")
                print(f"    URL: {url}")

                try:
                    page.goto(url, timeout=30000)
                    time.sleep(4)  # wait for content to render

                    # Wait for the main content area to appear
                    try:
                        page.wait_for_selector("article, main, .note-content, .prose", timeout=10000)
                    except:
                        print(f"    ⚠️  Content area not found, saving anyway...")

                    # Save as PDF
                    page.pdf(
                        path=str(filepath),
                        format="A4",
                        print_background=True,
                        margin={"top": "10mm", "bottom": "10mm", "left": "15mm", "right": "15mm"},
                    )

                    file_size = filepath.stat().st_size
                    print(f"    ✅ Saved: {filename} ({file_size:,} bytes)")
                    success_count += 1

                except Exception as e:
                    print(f"    ❌ Failed: {e}")
                    fail_count += 1

                # Small delay between pages
                time.sleep(1)

            # === Summary ===
            print(f"\n{'='*60}")
            print(f"📊 Summary: {success_count} saved, {skip_count} skipped, {fail_count} failed")
            print(f"📁 Output: {OUTPUT_DIR.absolute()}")
            print(f"{'='*60}")

            # Save mapping file
            mapping_file = OUTPUT_DIR / "subtopic_mapping.json"
            mapping_data = {
                slug: {"pmtCode": pmt, "displayName": name, "file": f"{pmt} {name}.pdf"}
                for slug, (pmt, name) in SUBTopic_MAP.items()
                if (OUTPUT_DIR / f"{pmt} {name}.pdf").exists()
            }
            mapping_file.write_text(json.dumps(mapping_data, indent=2, ensure_ascii=False))
            print(f"\n📋 Mapping saved to: {mapping_file}")

        finally:
            print("\n🔒 Closing browser in 3 seconds...")
            time.sleep(3)
            browser.close()


if __name__ == "__main__":
    main()
