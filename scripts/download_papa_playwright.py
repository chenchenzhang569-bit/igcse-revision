"""download_papa_playwright.py
Run on YOUR Windows machine (Python 3.14).
Uses Playwright + real Chrome to bypass Cloudflare JS Challenge.

Setup (run once):
    py -m pip install playwright supabase python-dotenv
    py -m playwright install chromium

Usage:
    py download_papa_playwright.py

How it works:
    1. Queries Supabase for all past_papers with papacambridge URLs
    2. Opens Chrome browser (visible, so you can see progress)
    3. For each paper: navigates to papacambridge → waits for Cloudflare →
       captures the redirected PDF download → uploads to Supabase Storage
    4. Updates past_papers DB record with new Supabase Storage URL
"""

import os
import re
import sys
import time
import json
import asyncio
import urllib.parse
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# ========== CONFIG ==========

# Load Supabase credentials from .env.local
ENV_PATH = Path(__file__).parent / ".env.local"
if not ENV_PATH.exists():
    ENV_PATH = Path.home() / "igcse-site" / ".env.local"
load_dotenv(ENV_PATH)

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

SUBJ_MAP = {"0580": "mathematics", "0625": "physics", "0620": "chemistry", "0610": "biology"}

DOWNLOAD_DIR = Path.home() / "Downloads" / "papa_downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# How many papers to process per run (set to 0 for all)
MAX_PAPERS = 0  # 0 = all remaining

# ========== SUPABASE HELPERS ==========

def fetch_remaining_papers():
    """Fetch all past_papers still pointing to papacambridge."""
    all_papers = []
    offset = 0
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/past_papers"
            f"?select=id,file_url,year&file_url=ilike.*papacambridge*"
            f"&limit=500&offset={offset}&order=id",
            headers=HEADERS, timeout=30,
        )
        batch = resp.json()
        if not batch:
            break
        all_papers.extend(batch)
        offset += 500
        print(f"  Fetched {len(all_papers)} papers so far...", end="\r")
    print(f"  Total remaining: {len(all_papers)}                    ")
    return all_papers


def upload_to_supabase(code, year, fname, pdf_path):
    """Upload PDF to Supabase Storage."""
    path = f"{code}/{year}/{fname}"
    with open(pdf_path, "rb") as f:
        data = f.read()

    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/past-papers/{path}",
        headers={**HEADERS, "Content-Type": "application/pdf", "x-upsert": "true"},
        data=data,
        timeout=120,
    )
    return resp.status_code in (200, 201)


def update_db(paper_id, code, year, fname):
    """Update past_papers record with new Supabase Storage URL."""
    new_url = f"{SUPABASE_URL}/storage/v1/object/public/past-papers/{code}/{year}/{fname}"
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/past_papers?id=eq.{paper_id}",
        headers={**HEADERS, "Prefer": "return=minimal"},
        json={"file_url": new_url},
        timeout=15,
    )
    return resp.status_code in (200, 204)


# ========== PLAYWRIGHT DOWNLOAD ==========

async def download_one(page, paper, semaphore):
    """Download a single paper using Playwright browser."""
    async with semaphore:
        paper_id = paper["id"]
        url = paper.get("file_url", "")
        year = str(paper.get("year", "2020"))
        fname = url.rstrip("/").rsplit("/", 1)[-1]

        # Extract subject code from filename
        m = re.match(r"(\d{4})_", fname)
        if not m:
            return "SKIP", "no code in filename"
        code = m.group(1)
        if code not in SUBJ_MAP:
            return "SKIP", f"unknown subject {code}"

        # Build the papacambridge page URL (not the download_file.php URL)
        # The DB URL might be either format:
        #   1. directories/CAIE/CAIE-pastpapers/upload/0625_s18_qp_11.pdf
        #   2. download_file.php?files=...
        if "download_file.php" in url:
            # Extract the actual file path
            match = re.search(r"files?=(.+)", urllib.parse.unquote(url))
            if match:
                direct_url = match.group(1)
            else:
                return "SKIP", "can't parse download_file URL"
        else:
            direct_url = url

        # Try the URL directly (papacambridge will redirect to Cloudflare challenge)
        page_url = direct_url
        if not page_url.startswith("http"):
            page_url = "https://pastpapers.papacambridge.com/" + page_url.lstrip("/")

        pdf_path = DOWNLOAD_DIR / fname

        try:
            # Navigate and wait for Cloudflare challenge to resolve
            print(f"  Navigating: {fname[:50]}", end=" ... ", flush=True)

            # Set up download listener BEFORE navigation
            download_promise = None

            async def handle_download(download):
                await download.save_as(str(pdf_path))

            page.on("download", handle_download)

            # Navigate to the URL
            resp = await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)

            # Wait for Cloudflare challenge to complete (page will auto-redirect)
            # Cloudflare usually takes 3-10 seconds
            await asyncio.sleep(5)

            # Check if we got an actual PDF or HTML
            content_type = await page.evaluate("() => document.contentType")
            page_content = await page.content()

            # If still on Cloudflare challenge page, wait more
            if "challenge-platform" in page_content or "Just a moment" in page_content:
                print("waiting Cloudflare...", end=" ", flush=True)
                for _ in range(30):  # Wait up to 30 more seconds
                    await asyncio.sleep(1)
                    page_content = await page.content()
                    if "challenge-platform" not in page_content and "Just a moment" not in page_content:
                        break

            # Check result
            page_content = await page.content()

            if "Just a moment" in page_content or "Enable JavaScript" in page_content:
                # Cloudflare challenge failed
                return "SKIP", "cloudflare blocked"

            # If the page is now showing a PDF or the download started
            if "application/pdf" in content_type or "error404" in page_content.lower():
                pass  # PDF loaded in browser or 404

            # Try clicking a download link if one exists
            dl_link = await page.query_selector("a[href$='.pdf']")
            if dl_link:
                href = await dl_link.get_attribute("href")
                if href and href.endswith(".pdf"):
                    await dl_link.click()
                    await asyncio.sleep(3)

            # Wait for download to complete
            await asyncio.sleep(2)
            page.remove_listener("download", handle_download)

            # Check if file was downloaded
            if pdf_path.exists() and pdf_path.stat().st_size > 2000:
                size_kb = pdf_path.stat().st_size // 1024
                print(f"OK ({size_kb}KB)", flush=True)

                # Upload to Supabase
                if upload_to_supabase(code, year, fname, pdf_path):
                    if update_db(paper_id, code, year, fname):
                        pdf_path.unlink()  # Clean up
                        return "OK", fname
                    else:
                        return "FAIL", "db update"
                else:
                    return "FAIL", "upload"
            else:
                # Check if the page shows an error
                title = await page.title()
                if "404" in title or "Not Found" in title:
                    return "SKIP", "404 not found"
                print(f"NO PDF (title: {title[:40]})", flush=True)
                return "SKIP", "no download triggered"

        except Exception as e:
            print(f"ERROR: {e}", flush=True)
            # Clean up partial download
            if pdf_path.exists():
                pdf_path.unlink()
            return "FAIL", str(e)[:80]


async def main():
    print("=" * 60)
    print("PapaCambridge PDF Downloader (Playwright)")
    print("=" * 60)

    # Fetch remaining papers
    print("\n📊 Fetching remaining papacambridge papers from Supabase...")
    papers = fetch_remaining_papers()

    if not papers:
        print("✅ No papacambridge papers remaining!")
        return

    if MAX_PAPERS > 0:
        papers = papers[:MAX_PAPERS]
        print(f"  Processing first {MAX_PAPERS} papers")
    else:
        print(f"  Processing ALL {len(papers)} papers")

    print(f"\n🔧 Starting Chrome browser...")
    print(f"📁 Downloads: {DOWNLOAD_DIR}")
    print(f"\nPress Ctrl+C to stop at any time.\n")

    async with async_playwright() as p:
        # Launch Chrome with PDF download enabled
        browser = await p.chromium.launch(
            headless=False,  # Must be visible to pass Cloudflare
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        context = await browser.new_context(
            accept_downloads=True,
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        # Semaphore to limit concurrency (1 at a time)
        semaphore = asyncio.Semaphore(1)

        ok = 0
        skip = 0
        fail = 0
        start_time = time.time()

        for i, paper in enumerate(papers):
            status, detail = await download_one(page, paper, semaphore)

            if status == "OK":
                ok += 1
            elif status == "SKIP":
                skip += 1
            else:
                fail += 1
                print(f"    ❌ {detail}", flush=True)

            # Progress report every 10 papers
            if (i + 1) % 10 == 0:
                elapsed = time.time() - start_time
                rate = (i + 1) / elapsed * 60 if elapsed > 0 else 0
                remaining = len(papers) - (i + 1)
                eta = remaining / rate if rate > 0 else 0
                print(
                    f"  [{i+1}/{len(papers)}] {ok} ok | {skip} skip | {fail} fail "
                    f"| {rate:.0f}/min | ETA: {eta:.0f}min",
                    flush=True,
                )

        await browser.close()

    # Final summary
    print(f"\n{'=' * 60}")
    print(f"✅ COMPLETE: {ok} downloaded | {skip} skipped | {fail} failed")
    print(f"📊 Hit rate: {ok}/{ok+skip+fail} ({ok/(ok+skip+fail)*100:.0f}%)" if (ok + skip + fail) > 0 else "")
    print(f"🕐 Elapsed: {(time.time()-start_time)/60:.1f} minutes")
    print(f"📁 Downloaded files cleaned up from {DOWNLOAD_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
