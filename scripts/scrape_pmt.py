#!/usr/bin/env python3
"""Scrape PMT IGCSE past papers and upload to Supabase"""

import requests, re, os, sys, json, time, tempfile
from urllib.parse import urljoin, unquote
from pathlib import Path

BASE = "https://www.physicsandmathstutor.com/past-papers/"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Supabase config
SUPABASE_URL = "https://aondldqwwvttwpervrfq.supabase.co"
SERVICE_KEY = os.environ.get("SUPABASE_KEY", "")
STORAGE_BUCKET = "past-papers"

# IGCSE paper pages
IGCSE_PAGES = {
    "Physics_CAIE": "gcse-physics/cie-igcse-paper-{n}/",
    "Physics_Edexcel": "gcse-physics/edexcel-igcse-paper-{n}/",
    "Chemistry_CAIE": "gcse-chemistry/cie-igcse-paper-{n}/",
    "Chemistry_Edexcel": "gcse-chemistry/edexcel-igcse-paper-{n}/",
    "Biology_CAIE": "gcse-biology/cie-igcse-paper-{n}/",
    "Biology_Edexcel": "gcse-biology/edexcel-igcse-paper-{n}/",
    "Maths_CAIE": "gcse-maths/cie-igcse-paper-{n}/",
    "Maths_Edexcel_A": "gcse-maths/edexcel-igcse-a-paper-{n}/",
}

PAPER_NUMS = {
    "Physics_CAIE": range(1, 7),
    "Physics_Edexcel": range(1, 3),
    "Chemistry_CAIE": range(1, 7),
    "Chemistry_Edexcel": range(1, 3),
    "Biology_CAIE": range(1, 7),
    "Biology_Edexcel": range(1, 3),
    "Maths_CAIE": range(1, 5),
    "Maths_Edexcel_A": range(1, 3),
}


def get_pdf_links(page_url):
    """Get all PDF links from a PMT paper page, filter recent years"""
    try:
        r = requests.get(page_url, timeout=30, headers=HEADERS)
        r.raise_for_status()
        pdfs = re.findall(r'href="(https://pmt\.physicsandmathstutor\.com/download/[^"]+\.pdf)"', r.text)
        # Filter: 2020-2024, QP or MS only
        result = []
        for p in pdfs:
            year_match = re.search(r'(202[0-4])', p)
            if not year_match:
                continue
            year = int(year_match.group(1))
            ptype = "QP" if "/QP/" in p else "MS" if "/MS/" in p else None
            if not ptype:
                continue
            # Extract variant
            variant = re.search(r'\(v(\d+)\)', p)
            var_num = int(variant.group(1)) if variant else 1
            result.append({"url": p, "year": year, "type": ptype, "variant": var_num})
        return result
    except Exception as e:
        print(f"  ERROR scraping {page_url}: {e}")
        return []


def pick_best_variants(pdfs):
    """For each year+type, keep only the highest variant"""
    groups = {}
    for p in pdfs:
        key = (p["year"], p["type"])
        if key not in groups or p["variant"] > groups[key]["variant"]:
            groups[key] = p
    return list(groups.values())


def main():
    # Get service key
    key_file = os.path.expanduser("~/igcse-site/.env.local")
    if not SERVICE_KEY:
        with open(key_file) as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    key = line.strip().split("=", 1)[1]
                    os.environ["SUPABASE_KEY"] = key
                    break

    service_key = os.environ.get("SUPABASE_KEY", "")
    if not service_key:
        print("ERROR: No Supabase service key found")
        return

    all_pdfs = []
    for name, template in IGCSE_PAGES.items():
        nums = PAPER_NUMS.get(name)
        if not nums:
            continue
        for n in nums:
            page_url = urljoin(BASE, template.format(n=n))
            print(f"\nScraping: {page_url}")
            pdfs = get_pdf_links(page_url)
            best = pick_best_variants(pdfs)
            for p in best:
                p["subject_key"] = name
                p["paper_num"] = n
            all_pdfs.extend(best)
            print(f"  Found {len(pdfs)} PDFs, kept {len(best)} after variant dedup")
            time.sleep(0.5)  # Be polite

    print(f"\n\nTotal PDFs to download: {len(all_pdfs)}")

    # Save the list
    manifest = Path("/tmp/pmt_igcse_manifest.json")
    manifest.write_text(json.dumps(all_pdfs, indent=2))
    print(f"Manifest saved to {manifest}")

    # Summary
    from collections import Counter
    subjects = Counter(p["subject_key"] for p in all_pdfs)
    types = Counter(p["type"] for p in all_pdfs)
    years = Counter(str(p["year"]) for p in all_pdfs)
    print(f"\nBy subject: {dict(subjects)}")
    print(f"By type: {dict(types)}")
    print(f"By year: {dict(sorted(years.items()))}")


if __name__ == "__main__":
    main()
