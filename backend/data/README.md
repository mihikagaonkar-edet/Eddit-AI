# Data sources

## artist_new.csv

Final merged dataset. Built by merging `youtube_artists.csv`,
`billboard1s_artists.csv`, `billboardtop10_artists.csv` and
`chartmasters_album_sales.csv` on artist name, keeping only artists present
in every file with a real (non-empty, non-zero) value for each metric.

| Column | Source | Retrieved via |
| --- | --- | --- |
| `Artist Name` | kworb.net/youtube/archive.html | `scripts/scrape_all_youtube_artists.py` |
| `youtube views` | kworb.net/youtube/archive.html | `scripts/scrape_all_youtube_artists.py` |
| `spotify monthly listeners` | kworb.net/spotify/listeners.html (+ listeners2.html-listeners11.html) | `scripts/add_spotify_listeners_to_youtube_artists.py`, `scripts/check_more_spotify_pages.py` |
| `Billboard #1` | data/hot100.csv (Billboard Hot 100 weekly chart history) | `scripts/filter_billboard_ones.py`, `scripts/aggregate_billboard_ones_by_artist.py` |
| `Billboard top 10` | data/hot100.csv (Billboard Hot 100 weekly chart history) | `scripts/aggregate_billboard_top10_by_artist.py` |
| `Singles sold` | chartmasters.org/best-selling-artists-of-all-time (Physical Singles + Digital & Streamed Singles, EAS) | `scripts/scrape_chartmasters_album_sales.py`, `scripts/add_singles_sold_to_chartmasters.py` |
| `Albums sold` | chartmasters.org/best-selling-artists-of-all-time (Studio Albums + Other LPs, EAS) | `scripts/scrape_chartmasters_album_sales.py`, `scripts/add_albums_sold_to_chartmasters.py` |
| `awards` | Wikidata (`award received`, property P166) | `scripts/add_awards_to_artist_new.py` |

Merge scripts: `scripts/merge_artist_datasets.py` (youtube + billboard1s +
billboardtop10 -> artist_new.csv), then `scripts/merge_chartmasters_into_artist_new.py`
(adds Singles sold / Albums sold from chartmasters_album_sales.csv), then
`scripts/add_awards_to_artist_new.py` (adds awards from Wikidata).

## Intermediate files

- **youtube_artists.csv** -- all artists from kworb.net/youtube/archive.html
  plus any artists.csv artists not found there, with total YouTube views (in
  millions) and Spotify monthly listeners.
- **billboard1s.csv** -- every row of `hot100.csv` where Rank == 1 (one row
  per week a song held #1).
- **billboard1s_artists.csv** -- billboard1s.csv aggregated by individual
  artist (collaboration credits split), counting distinct #1 songs.
- **billboardtop10_artists.csv** -- hot100.csv rows with Rank 1-10,
  aggregated by individual artist, counting distinct top-10 songs.
- **chartmasters_album_sales.csv** -- full "Best-Selling Artists of All
  Time" ranking from chartmasters.org, including their Career Sales
  Performance Composite (CSPC) breakdown (studio albums, other LPs,
  physical singles, digital/streamed singles, streamed albums).
- **hot100.csv** -- weekly Billboard Hot 100 chart history (pre-existing in
  this repo; not produced by a script in this session).
- **artists.csv** -- original hand-curated artist dataset (pre-existing);
  used as a supplementary source for artists missing from kworb.net.

## missing_*.txt files

Each scraping script that couldn't match every artist writes the unmatched
names to a `missing_*.txt` file of the same name (e.g.
`missing_spotify_monthly_listeners.txt`, `missing_awards.txt`) so gaps are
traceable back to their source step.
