import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SearchBar } from '../components/SearchBar';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function ArtistsPage() {
  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists(0, 100),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
      <h1 className="font-display text-3xl">Artists</h1>
      <SearchBar />

      {isLoading && <p className="text-muted">Loading...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {artists.map((artist) => (
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
    </div>
  );
}
