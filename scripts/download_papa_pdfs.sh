#!/bin/bash
# download_papa_pdfs.sh - Download papacambridge-linked PDFs from mirrors
# Tries bestexamhelp → pastpapers.co → dynamicpapers → skip
set -uo pipefail

eval $(grep -E 'SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY' ~/igcse-site/.env.local | sed 's/NEXT_PUBLIC_//' | sed 's/^/export /')

TOTAL_OK=0; TOTAL_SKIP=0; TOTAL_FAIL=0
BATCH=100; OFFSET=0
TMPFILE="/tmp/papa_dl.pdf"

declare -A SUBJ_MAP=(
  ["0580"]="mathematics"  ["0625"]="physics"
  ["0620"]="chemistry"    ["0610"]="biology"
)

# Subject display names for pastpapers.co
declare -A SUBJ_DISPLAY=(
  ["0580"]="Mathematics-0580"  ["0625"]="Physics-0625"
  ["0620"]="Chemistry-0620"    ["0610"]="Biology-0610"
)

api_get() {
  curl -s --max-time 20 \
    "${SUPABASE_URL}/rest/v1/past_papers?select=id,file_url,year&file_url=ilike.*papacambridge*&limit=${BATCH}&offset=${OFFSET}&order=id" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
}

api_patch() {
  curl -s --max-time 15 -o /dev/null -w "%{http_code}" \
    -X PATCH "${SUPABASE_URL}/rest/v1/past_papers?id=eq.${1}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d "{\"file_url\": \"${2}\"}"
}

upload_pdf() {
  curl -s --max-time 60 -o /dev/null -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/storage/v1/object/past-papers/${1}/${2}/${3}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/pdf" -H "x-upsert: true" \
    --data-binary @"${TMPFILE}"
}

try_download() {
  local url="$1"
  curl -s --max-time 30 -o "$TMPFILE" -w "%{http_code}" \
    "$url" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

download_paper() {
  local fname="$1" code="$2" year="$3" subj="$4"
  local http size
  
  # Source 1: bestexamhelp.com
  http=$(try_download "https://bestexamhelp.com/exam/cambridge-igcse/${subj}-${code}/${year}/${fname}")
  size=$(stat -c%s "$TMPFILE" 2>/dev/null || echo 0)
  if [ "$http" = "200" ] && [ "$size" -gt 2000 ]; then echo "bestexam"; return 0; fi
  
  # Source 2: dynamicpapers.com
  http=$(try_download "https://dynamicpapers.com/wp-content/uploads/2015/09/${fname}")
  size=$(stat -c%s "$TMPFILE" 2>/dev/null || echo 0)
  if [ "$http" = "200" ] && [ "$size" -gt 2000 ]; then echo "dynamicpapers"; return 0; fi
  
  return 1
}

echo "=== Download PapaCambridge PDFs ==="
echo "Started: $(date -Iseconds)"
echo "Sources: bestexamhelp → dynamicpapers"
echo ""

while true; do
  DATA=$(api_get)
  COUNT=$(echo "$DATA" | jq '. | length')
  
  [ "$COUNT" -eq 0 ] && { echo "No more papers. Done!"; break; }
  
  echo "--- Batch offset=$OFFSET, $COUNT papers [$TOTAL_OK ok / $TOTAL_SKIP skip / $TOTAL_FAIL fail] ---"
  
  for i in $(seq 0 $((COUNT - 1))); do
    ID=$(echo "$DATA" | jq -r ".[$i].id")
    URL=$(echo "$DATA" | jq -r ".[$i].file_url")
    YEAR=$(echo "$DATA" | jq -r ".[$i].year // \"2020\"")
    FNAME=$(echo "$URL" | xargs basename 2>/dev/null)
    CODE=$(echo "$FNAME" | grep -oP '^\d{4}' || echo "")
    SUBJ="${SUBJ_MAP[$CODE]:-}"
    
    if [ -z "$SUBJ" ]; then
      TOTAL_SKIP=$((TOTAL_SKIP + 1))
      continue
    fi
    
    SOURCE=$(download_paper "$FNAME" "$CODE" "$YEAR" "$SUBJ")
    if [ $? -ne 0 ]; then
      TOTAL_SKIP=$((TOTAL_SKIP + 1))
      continue
    fi
    
    UP=$(upload_pdf "$CODE" "$YEAR" "$FNAME")
    if [ "$UP" != "200" ] && [ "$UP" != "201" ]; then
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      continue
    fi
    
    NEW_URL="${SUPABASE_URL}/storage/v1/object/public/past-papers/${CODE}/${YEAR}/${FNAME}"
    PATCH=$(api_patch "$ID" "$NEW_URL")
    
    if [ "$PATCH" = "204" ] || [ "$PATCH" = "200" ]; then
      echo "  [$((i+1))/$COUNT] [$SOURCE] $FNAME"
      TOTAL_OK=$((TOTAL_OK + 1))
    else
      echo "  [$((i+1))/$COUNT] DB FAIL: $FNAME"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
    
    sleep 0.15
  done
  
  OFFSET=$((OFFSET + BATCH))
done

echo ""
echo "=========================================="
echo "COMPLETE: $TOTAL_OK downloaded | $TOTAL_SKIP skipped | $TOTAL_FAIL failed"
echo "Finished: $(date -Iseconds)"
