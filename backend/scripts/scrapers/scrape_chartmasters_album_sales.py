"""
Scrape the "Best-Selling Artists of All Time" ranking from
chartmasters.org/best-selling-artists-of-all-time/ and save it to
data/chartmasters_album_sales.csv.

The ranking table on that page is a WordPress "wpDataTables" widget that
loads its rows via a server-side AJAX call rather than static HTML, so this
script:
  1. Fetches the page once to read the table's per-page security nonce
     (wdtNonceFrontendServerSide_41).
  2. POSTs to admin-ajax.php?action=get_wdtable&table_id=41 with that nonce
     to pull every row as JSON in one request (length=-1 = "all rows").
  3. Strips the HTML markup wrapping the artist name/image cells and writes
     the numeric sales columns as plain integers.

Chartmasters tracks "Equivalent Album Sales" (EAS) -- physical sales,
downloads and streams converted to a common album-equivalent unit -- and
publishes a single "CSPC" (Career Sales Performance Composite) total per
artist, which is the headline number most people mean by "albums sold".

Run from backend/ directory:
    python scripts/scrape_chartmasters_album_sales.py
"""

import csv
import re
from pathlib import Path

import requests

PAGE_URL    = "https://chartmasters.org/best-selling-artists-of-all-time/"
AJAX_URL    = "https://chartmasters.org/wp-admin/admin-ajax.php?action=get_wdtable&table_id=41"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "chartmasters_album_sales.csv"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# Order matches the "data" array returned by the AJAX endpoint (17 columns).
COLUMNS = [
    "rank", "artist_spotify_id", "g#", "image", "artist_name",
    "sales_studio_albums", "sales_update_date", "sales_other_lps",
    "physical_single", "sales_singles_digitals", "streams_updated",
    "cspc", "streams_updated_value", "gender", "genre", "country", "language",
]

TAG_RE = re.compile(r"<[^>]+>")


def strip_tags(html: str) -> str:
    return TAG_RE.sub("", html).strip()


def to_int(value: str) -> int:
    value = value.strip()
    return int(value.replace(",", "")) if value else 0


def fetch_nonce(session: requests.Session) -> str:
    resp = session.get(PAGE_URL, timeout=20)
    resp.raise_for_status()
    match = re.search(r'wdtNonceFrontendServerSide_41.*?value="([a-f0-9]+)"', resp.text)
    if not match:
        raise RuntimeError("Could not find wpDataTables nonce on the page")
    return match.group(1)


def fetch_rows(session: requests.Session, nonce: str) -> list[list[str]]:
    payload = {
        "draw": "1",
        "start": "0",
        "length": "-1",  # -1 = return every row in one response
        "search[value]": "",
        "search[regex]": "false",
        "wdtNonce": nonce,
    }
    resp = session.post(AJAX_URL, data=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["data"]


def main():
    session = requests.Session()
    session.headers.update(HEADERS)

    print("Fetching page nonce...")
    nonce = fetch_nonce(session)

    print("Fetching ranking data...")
    rows = fetch_rows(session, nonce)
    print(f"Loaded {len(rows)} artists\n")

    out_rows = []
    for row in rows:
        record = dict(zip(COLUMNS, row))
        streams_value, _, updated_note = record["streams_updated"].partition("</br>")

        out_rows.append({
            "Rank": to_int(record["g#"]),
            "Artist Name": strip_tags(record["artist_name"]),
            "Studio Albums (EAS)": to_int(record["sales_studio_albums"]),
            "Other LPs (EAS)": to_int(record["sales_other_lps"]),
            "Physical Singles (EAS)": to_int(record["physical_single"]),
            "Digital & Streamed Singles (EAS)": to_int(record["sales_singles_digitals"]),
            "Streamed Albums (EAS)": to_int(streams_value),
            "Streamed Albums Last Updated": updated_note.strip(" ()"),
            "Total Album-Equivalent Sales (CSPC)": to_int(record["cspc"]),
            "Gender": record["gender"],
            "Genre": record["genre"],
            "Country": record["country"],
            "Language": record["language"],
        })

    out_rows.sort(key=lambda r: r["Rank"])

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()))
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"Wrote {len(out_rows)} artists to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
