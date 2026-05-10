#!/usr/bin/env python3
"""
Scrape CAIE IGCSE past papers from PapaCambridge and insert into Supabase.
Covers: 0580 (Math), 0625 (Physics), 0620 (Chemistry), 0610 (Biology)
"""

import re
import sys
import json
import time
import urllib.parse
import requests
from bs4 import BeautifulSoup

# Force unbuffered output for progress tracking
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

BASE = "https://pastpapers.papacambridge.com"

# Subject codes and their slugs
SUBJECTS = {
    "0580": "igcse-mathematics-0580",
    "0625": "igcse-physics-0625",
    "0620": "igcse-chemistry-0620",
    "0610": "igcse-biology-0610",
}

SEASON_MAP = {
    "may-june": "May/Jun",
    "march": "Mar",
    "feb-march": "Feb/Mar",
    "oct-nov": "Oct/Nov",
    "nov": "Nov",
    "mar": "Mar",
    "jun": "Jun",
}

# Season canonicalization
def normalize_season(raw: str) -> str:
    raw = raw.lower().strip()
    for k, v in SEASON_MAP.items():
        if k in raw:
            return v
    return raw.title()

def extract_paper_info(filename: str) -> dict | None:
    """Extract paper metadata from filename like '0580_s24_qp_11.pdf'"""
    # Remove .pdf and path
    basename = filename.replace(".pdf", "").split("/")[-1]
    
    # Patterns: CODE_sYY_TYPE_NUM.pdf or CODE_wYY_TYPE_NUM.pdf
    match = re.match(r"(\d{4})_([sw])(\d{2})_(qp|ms|er|gt)_(\d{2})", basename)
    if not match:
        # Try alternate: CODE_sYY_TYPE_NUM (single digit paper number)
        match = re.match(r"(\d{4})_([sw])(\d{2})_(qp|ms|er|gt)_(\d)", basename)
    if not match:
        # Another pattern: CODE_YY_s_TYPE_NUM  
        match = re.match(r"(\d{4})_(\d{2})_([sw])_(qp|ms|er|gt)_(\d{2})", basename)
    
    if match:
        code, season_letter, year_suffix, paper_type, paper_num = match.groups()
        year = 2000 + int(year_suffix)
        season_code = "s" if season_letter == "s" else "w"
        
        paper_type_name = {"qp": "Question Paper", "ms": "Mark Scheme", 
                          "er": "Examiner Report", "gt": "Grade Threshold"}.get(paper_type, paper_type)
        
        return {
            "code": code,
            "year": year,
            "season_letter": season_letter,
            "paper_type": paper_type,
            "paper_number": int(paper_num),
            "paper_type_name": paper_type_name,
        }
    
    # Try simpler: CODE_YY_s.pdf or CODE_sYY.pdf  
    match = re.match(r"(\d{4})_([sw])(\d{2})", basename)
    if match:
        code, season_letter, year_suffix = match.groups()
        year = 2000 + int(year_suffix)
        return {
            "code": code,
            "year": year,
            "season_letter": season_letter,
            "paper_type": "qp",
            "paper_number": 0,
            "paper_type_name": "Question Paper",
        }
    
    return None

def get_page_links(url: str) -> list[str]:
    """Get all href links from a page"""
    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            # Skip external/asset links
            if href.startswith("http") and BASE not in href:
                continue
            if any(x in href for x in ["assets/", ".css", ".js", ".png", ".svg", ".ico", "fonts.", "cdn"]):
                continue
            if href in ("#", "../../", "index"):
                continue
            links.append(href)
        return links
    except Exception as e:
        print(f"  Error fetching {url}: {e}")
        return []

def main():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })
    
    all_papers = []
    
    for code, slug in SUBJECTS.items():
        print(f"\n{'='*60}")
        print(f"Subject: {code} ({slug})")
        print(f"{'='*60}")
        
        subject_url = f"{BASE}/papers/caie/{slug}"
        year_links = get_page_links(subject_url)
        
        # Filter to year+season links only
        season_links = [l for l in year_links if re.search(rf"{slug}-\d{{4}}", l)]
        print(f"  Found {len(season_links)} year/season folders")
        
        for slink in season_links:
            # Extract year and season from URL
            # e.g. papers/caie/igcse-mathematics-0580-2024-may-june
            rest = slink.replace(f"papers/caie/{slug}-", "")
            parts = rest.split("-")
            year_str = parts[0]
            season_str = "-".join(parts[1:])
            
            try:
                year = int(year_str)
            except ValueError:
                print(f"  Skipping invalid year: {slink}")
                continue
            
            season = normalize_season(season_str)
            print(f"  {year} {season}...", end=" ")
            
            folder_url = slink if slink.startswith("http") else f"{BASE}/{slink}"
            paper_links = get_page_links(folder_url)
            
            # Filter to PDF links only (via download_file.php)
            pdf_links = [l for l in paper_links if "download_file.php" in l and ".pdf" in l]
            print(f"{len(pdf_links)} papers")
            
            for plink in pdf_links:
                # Extract the actual PDF URL from download_file.php?files=...
                match = re.search(r'files?=(.+)', plink)
                if not match:
                    continue
                pdf_url = urllib.parse.unquote(match.group(1))
                filename = pdf_url.split("/")[-1]
                
                info = extract_paper_info(filename)
                if not info:
                    # Try to infer from folder context
                    info = {
                        "code": code,
                        "year": year,
                        "season_letter": "s",
                        "paper_type": "qp",
                        "paper_number": 0,
                        "paper_type_name": "Question Paper",
                    }
                
                # Include question papers (qp) and mark schemes (ms)
                if info["paper_type"] not in ("qp", "ms"):
                    continue
                
                paper_type_label = "QP" if info["paper_type"] == "qp" else "MS"
                paper = {
                    "subject_code": info["code"],
                    "year": info["year"],
                    "season": season,
                    "paper_number": info["paper_number"],
                    "paper_type": info["paper_type_name"],
                    "title": f"CAIE IGCSE {slug.replace('igcse-', '').title()} ({info['code']}) - {info['year']} {season} - {paper_type_label} Paper {info['paper_number']}",
                    "file_url": pdf_url,
                    "is_free": True,
                }
                all_papers.append(paper)
            
            time.sleep(0.3)  # Be polite
    
    # Summary
    print(f"\n{'='*60}")
    print(f"TOTAL: {len(all_papers)} question papers scraped")
    
    # Group by subject code
    by_subject = {}
    for p in all_papers:
        code = p["subject_code"]
        by_subject.setdefault(code, []).append(p)
    
    for code, papers in sorted(by_subject.items()):
        years = sorted(set(p["year"] for p in papers))
        print(f"  {code}: {len(papers)} papers, years {min(years)}-{max(years)}")
    
    # Save to JSON
    output_path = "/tmp/pastpapers_data.json"
    with open(output_path, "w") as f:
        json.dump(all_papers, f, indent=2, ensure_ascii=False)
    print(f"\nSaved to {output_path}")
    
    return all_papers

if __name__ == "__main__":
    main()
