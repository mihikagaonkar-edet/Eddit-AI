import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getApiBaseUrl } from '../api/client';
import type { Artist } from '../types';

type SortField = keyof Pick<
  Artist,
  | 'name'
  | 'rating'
  | 'billboard_top_10'
  | 'billboard_number_1'
  | 'albums_sold'
  | 'singles_sold'
  | 'avg_songs_per_year'
  | 'awards'
  | 'youtube_views'
  | 'spotify_monthly_listeners'
>;

type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'rating', label: 'Rating' },
  { value: 'billboard_top_10', label: 'Billboard Top 10' },
  { value: 'billboard_number_1', label: 'Billboard #1' },
  { value: 'albums_sold', label: 'Albums Sold' },
  { value: 'singles_sold', label: 'Singles Sold' },
  { value: 'avg_songs_per_year', label: 'Avg Songs / Year' },
  { value: 'awards', label: 'Awards' },
  { value: 'youtube_views', label: 'YouTube Views' },
  { value: 'spotify_monthly_listeners', label: 'Spotify Listeners' },
];

const COLUMNS: { key: SortField; label: string; align?: 'right' }[] = SORT_OPTIONS.map((o) => ({
  key: o.value,
  label: o.label,
  align: o.value === 'name' ? undefined : 'right',
}));

function formatNumber(n?: number | null) {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function cellValue(artist: Artist, key: SortField): string {
  const val = artist[key];
  if (val == null) return '—';
  if (key === 'name') return artist.name;
  if (key === 'avg_songs_per_year' || key === 'rating') return String(val);
  return formatNumber(val as number);
}

function compareValues(a: Artist, b: Artist, field: SortField, direction: SortDirection): number {
  const av = a[field];
  const bv = b[field];

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  let cmp: number;
  if (field === 'name') {
    cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
  } else {
    cmp = Number(av) - Number(bv);
  }

  return direction === 'asc' ? cmp : -cmp;
}

export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: artists = [], isLoading, isError, error } = useQuery({
    queryKey: ['artists', 'all'],
    queryFn: () => api.getArtists(0, 1000),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? artists.filter((a) => a.name.toLowerCase().includes(q))
      : [...artists];

    list.sort((a, b) => compareValues(a, b, sortField, sortDirection));
    return list;
  }, [artists, search, sortField, sortDirection]);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-8 space-y-4">
      <header className="mb-2">
        <h1 className="font-display text-5xl text-accent md:hidden tracking-widest">EDDIT</h1>
        <p className="draft-label mt-1">Discovery</p>
        <p className="font-display text-2xl md:text-4xl mt-1 text-off-white">Show us your Top 5.</p>
      </header>

      <input
        type="search"
        placeholder="Search artists by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full draft-card px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/40"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort by</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="draft-card px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex rounded-lg border border-white/10 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setSortDirection('asc')}
            className={`px-3 py-2 transition-colors font-medium ${
              sortDirection === 'asc' ? 'bg-accent text-charcoal' : 'bg-charcoal-card text-muted hover:text-off-white'
            }`}
          >
            Asc
          </button>
          <button
            type="button"
            onClick={() => setSortDirection('desc')}
            className={`px-3 py-2 transition-colors font-medium ${
              sortDirection === 'desc' ? 'bg-accent text-charcoal' : 'bg-charcoal-card text-muted hover:text-off-white'
            }`}
          >
            Desc
          </button>
        </div>

        <span className="text-muted text-sm ml-auto">
          {filtered.length} artist{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {isLoading && <p className="text-muted">Loading artists...</p>}

      {isError && (
        <p className="text-red-400 text-sm">
          Could not load artists: {error instanceof Error ? error.message : 'Request failed'}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="table-scroll-wrap">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 draft-label whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((artist, idx) => (
                <tr
                  key={artist.id}
                  onClick={() => navigate(`/artists/${artist.id}`)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                    idx === 0 && sortField === 'rating' && sortDirection === 'desc' ? 'border-l-2 border-l-gold' : ''
                  }`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-3 whitespace-nowrap ${
                        col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                      } ${col.key === 'name' ? 'font-display text-base tracking-wide' : 'text-off-white/90'}`}
                    >
                      {cellValue(artist, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-muted space-y-2">
                    <p>No artists found</p>
                    {artists.length === 0 && (
                      <p className="text-xs text-red-400/90">
                        API: {getApiBaseUrl()} — if requests fail, set API_URL on the Railway frontend service
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
