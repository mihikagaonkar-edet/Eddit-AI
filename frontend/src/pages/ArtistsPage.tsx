import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function ArtistsPage() {
  const [search, setSearch] = useState('');

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['artists', 'all'],
    queryFn: () => api.getArtists(0, 1000),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, search]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
      <h1 className="font-display text-3xl">Artists</h1>

      <input
        type="search"
        placeholder="Search artists by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/50"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} artist{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="bg-charcoal-card rounded-2xl p-4 border border-white/8 hover:border-accent/30 transition-all flex flex-col items-center text-center gap-2"
              >
                <ArtistAvatar name={artist.name} size="lg" />
                <p className="font-display text-lg">{artist.name}</p>
                {artist.rating != null && (
                  <p className="text-gold text-xs">★ {artist.rating}</p>
                )}
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted text-center py-8">No artists found</p>
          )}
        </>
      )}
    </div>
  );
}
