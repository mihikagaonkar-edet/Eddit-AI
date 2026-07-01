import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { UserAvatar } from '../components/UserAvatar';
import type { Artist } from '../types';

function fmtStat(val: number | null | undefined): string {
  if (val == null) return '—';
  if (val >= 1_000_000_000) return `${(val / 1e9).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1e3).toFixed(0)}K`;
  return String(val);
}

export function RankingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
  });

  const { data: allArtists = [] } = useQuery({
    queryKey: ['artists-all'],
    queryFn: () => api.getArtists(0, 500),
  });

  if (isLoading) return <p className="p-6 text-muted">Loading rankings...</p>;
  if (!data) return null;

  const ratingSub = (a: { rating?: number | null }) =>
    a.rating != null ? `★ ${a.rating}` : '';

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      <header className="page-header">
        <p className="draft-label">Competition</p>
        <h1 className="font-headline text-5xl text-off-white mt-1">Rankings</h1>
        <p className="text-muted text-sm mt-2">Discovery. Debate. Bragging rights.</p>
      </header>

      <ComparisonGrid initialArtists={data.top_artists} allArtists={allArtists} />

      <Leaderboard
        title="Top Teams"
        items={data.top_teams.map((a) => ({ id: a.id, name: `Team ${a.name}`, sub: ratingSub(a), link: `/teams/${a.id}`, imageUrl: a.image_url }))}
      />
      <Leaderboard
        title="Most Debated"
        items={data.most_debated_artists.map((a) => ({ id: a.id, name: a.name, sub: 'Hot debate', link: `/artists/${a.id}`, imageUrl: a.image_url }))}
      />
      <Leaderboard
        title="Most Liked"
        items={data.most_liked_artists.slice(0, 5).map((a) => ({ id: a.id, name: a.name, sub: '👍 Fan favorite', link: `/artists/${a.id}`, imageUrl: a.image_url }))}
      />
      <Leaderboard
        title="Most Disliked"
        items={data.most_disliked_artists.map((a) => ({ id: a.id, name: a.name, sub: '👎 Controversial', link: `/artists/${a.id}`, imageUrl: a.image_url }))}
      />

      <section>
        <p className="draft-label mb-3">Most Active Fans</p>
        <div className="space-y-1.5">
          {data.most_active_fans.map((fan, i) => (
            <Link
              key={fan.id}
              to={`/profile/${fan.username}`}
              className={`flex items-center gap-3 p-3 draft-card-row hover:border-accent/30 transition-colors ${
                i === 0 ? 'draft-card-hero' : ''
              }`}
            >
              <span className={`rank-num text-3xl w-10 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                {i + 1}
              </span>
              <UserAvatar name={fan.name} profileImageUrl={fan.profile_image_url} size="sm" />
              <div>
                <p className="font-display text-base tracking-wide">{fan.name}</p>
                <p className="text-muted text-xs">@{fan.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ComparisonGrid({ initialArtists, allArtists }: { initialArtists: Artist[]; allArtists: Artist[] }) {
  const [slotIds, setSlotIds] = useState<string[]>(() =>
    initialArtists.slice(0, 6).map((a) => a.id)
  );
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);

  const artistMap = useMemo(
    () => new Map([...initialArtists, ...allArtists].map((a) => [a.id, a])),
    [initialArtists, allArtists]
  );

  const rankMap = useMemo(() => {
    const sorted = [...artistMap.values()]
      .filter((a) => a.rating != null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const map = new Map<string, number>();
    sorted.forEach((a, i) => map.set(a.id, i + 1));
    return map;
  }, [artistMap]);

  const slots = slotIds
    .map((id) => artistMap.get(id))
    .filter((a): a is Artist => a != null);

  function swapArtist(slotIdx: number, artist: Artist) {
    setSlotIds((ids) => ids.map((id, i) => (i === slotIdx ? artist.id : id)));
    setSwappingIdx(null);
  }

  const usedIds = new Set(slotIds);
  const candidates = [...artistMap.values()].filter((a) => !usedIds.has(a.id));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="draft-label">Artist Comparison</p>
        <p className="text-muted text-[10px] font-display tracking-widest uppercase">Tap swap to compare</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((artist, i) => (
          <ArtistCompareCard
            key={artist.id}
            artist={artist}
            rank={rankMap.get(artist.id) ?? null}
            isSwapping={swappingIdx === i}
            onSwapToggle={() => setSwappingIdx(swappingIdx === i ? null : i)}
            onSwapSelect={(a) => swapArtist(i, a)}
            candidates={candidates}
          />
        ))}
      </div>
    </section>
  );
}

function ArtistCompareCard({
  artist,
  rank,
  isSwapping,
  onSwapToggle,
  onSwapSelect,
  candidates,
}: {
  artist: Artist;
  rank: number | null;
  isSwapping: boolean;
  onSwapToggle: () => void;
  onSwapSelect: (a: Artist) => void;
  candidates: Artist[];
}) {
  const stats = [
    { label: 'Rating', value: artist.rating != null ? `★ ${artist.rating}` : null, gold: true },
    { label: 'Spotify', value: artist.spotify_monthly_listeners != null ? fmtStat(artist.spotify_monthly_listeners) : null },
    { label: 'YouTube', value: artist.youtube_views != null ? fmtStat(artist.youtube_views) : null },
  ].filter((s) => s.value != null) as { label: string; value: string; gold?: boolean }[];

  return (
    <div className="relative">
      <div
        className="draft-card p-2.5 flex flex-col items-center"
        style={rank === 1 ? { borderLeft: '3px solid var(--color-gold)' } : undefined}
      >
        <Link
          to={`/artists/${artist.id}`}
          className="w-full flex flex-col items-center hover:opacity-90 transition-opacity"
        >
          <span className={`rank-num text-xl self-start leading-none ${rank === 1 ? 'text-gold' : 'text-muted'}`}>
            {rank != null ? `#${rank}` : '—'}
          </span>

          <div className="my-2">
            <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size="lg" />
          </div>

          <span className="font-display text-[11px] tracking-wide text-center line-clamp-2 hover:text-accent transition-colors leading-tight">
            {artist.name}
          </span>
        </Link>

        {stats.length > 0 && (
          <div className="mt-2 w-full space-y-1">
            {stats.map((s) => (
              <div key={s.label} className="flex justify-between items-center gap-1">
                <span className="text-[8px] font-display tracking-[0.15em] text-muted uppercase shrink-0">
                  {s.label}
                </span>
                <span className={`text-[10px] font-display truncate ${s.gold ? 'text-gold' : 'text-off-white'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onSwapToggle}
          className={`mt-3 text-[9px] font-display tracking-[0.18em] uppercase transition-colors ${
            isSwapping ? 'text-accent' : 'text-muted hover:text-off-white'
          }`}
        >
          ⇄ Swap
        </button>
      </div>

      {isSwapping && (
        <ArtistPicker
          candidates={candidates}
          onSelect={onSwapSelect}
          onClose={onSwapToggle}
        />
      )}
    </div>
  );
}

function ArtistPicker({
  candidates,
  onSelect,
  onClose,
}: {
  candidates: Artist[];
  onSelect: (a: Artist) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((a) => a.name.toLowerCase().includes(q));
  }, [candidates, query]);

  return (
    <div className="absolute inset-0 z-10 rounded-xl overflow-hidden flex flex-col bg-charcoal-card border border-accent/40 shadow-lg">
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/8 shrink-0">
        <span className="draft-label">Pick artist</span>
        <button
          onClick={onClose}
          className="text-muted hover:text-off-white transition-colors text-xs leading-none"
        >
          ✕
        </button>
      </div>
      <div className="px-2 py-1.5 border-b border-white/8 shrink-0">
        <input
          autoFocus
          type="text"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-charcoal-light/60 border border-white/10 rounded-md px-2 py-1 text-[10px] text-off-white placeholder-muted focus:outline-none focus:border-accent/40"
        />
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-muted text-[10px] text-center py-4">No artists found</p>
        ) : (
          filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors text-left"
            >
              <ArtistAvatar name={a.name} imageUrl={a.image_url} size="sm" />
              <div className="min-w-0">
                <p className="font-display text-[10px] tracking-wide truncate">{a.name}</p>
                {a.rating != null && (
                  <p className="text-gold text-[8px] font-display">★ {a.rating}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function Leaderboard({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; sub: string; link: string; imageUrl?: string | null }[];
}) {
  return (
    <section>
      <p className="draft-label mb-3">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <Link
            key={item.id}
            to={item.link}
            className={`flex items-center gap-3 p-3 transition-colors hover:border-accent/30 ${
              i === 0 ? 'draft-card-hero' : 'draft-card-row'
            }`}
          >
            <span className={`rank-num text-3xl w-10 shrink-0 ${i === 0 ? 'text-gold' : 'text-muted'}`}>
              {i + 1}
            </span>
            <ArtistAvatar name={item.name.replace(/^Team /, '')} imageUrl={item.imageUrl} size="sm" />
            <div className="min-w-0">
              <p className="font-display text-base tracking-wide truncate">{item.name}</p>
              {item.sub && <p className="text-muted text-xs">{item.sub}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
