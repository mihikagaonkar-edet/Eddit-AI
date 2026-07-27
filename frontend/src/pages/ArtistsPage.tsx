import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { useMusicBrainzFallback } from '../hooks/useMusicBrainzFallback';
import { useAuth } from '../context/AuthContext';

function ArtistCardWave() {
  return (
    <svg
      viewBox="0 0 128 20"
      preserveAspectRatio="none"
      className="artist-card-wave"
      aria-hidden
    >
      <path
        d="M0,10 Q8,2 16,10 T32,10 T48,10 T64,10 T80,10 T96,10 T112,10 T128,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="artist-card-wave-path"
      />
      <path
        d="M0,13 Q10,6 20,13 T40,13 T60,13 T80,13 T100,13 T120,13 T128,13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
        className="artist-card-wave-path"
        style={{ animationDirection: 'reverse' }}
      />
    </svg>
  );
}

export function ArtistsPage() {
  const [search, setSearch] = useState('');
  const [addingArtist, setAddingArtist] = useState(false);
  const [addError, setAddError] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['artists', 'all'],
    queryFn: () => api.getArtists(0, 1000),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, search]);

  const { candidate, loading: checkingMusicBrainz } = useMusicBrainzFallback(
    search,
    filtered.length > 0
  );

  const addFromMusicBrainz = async () => {
    if (!candidate || addingArtist) return;
    setAddingArtist(true);
    setAddError('');
    try {
      await api.createArtistFromMusicBrainz(candidate.name, candidate.musicbrainz_id);
      await queryClient.invalidateQueries({ queryKey: ['artists'] });
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add artist');
    } finally {
      setAddingArtist(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6 pb-8">
      <header className="page-header">
        <p className="draft-label">Roster</p>
        <h1 className="font-headline text-5xl text-off-white mt-1">Artists</h1>
      </header>

      <input
        type="search"
        placeholder="Search artists by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-stage"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} artist{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="artist-grid-card p-4 flex flex-col items-center text-center gap-3"
              >
                <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size="lg" />
                <p className="font-display text-base tracking-wide text-off-white">{artist.name}</p>
                {artist.rating != null && (
                  <p className="text-gold text-xs">★ {artist.rating}</p>
                )}
                <ArtistCardWave />
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted">No artists found</p>
              {search.trim().length >= 2 && (
                <div className="draft-card p-3 max-w-xs mx-auto space-y-2">
                  {checkingMusicBrainz ? (
                    <p className="text-muted text-xs">Checking our records...</p>
                  ) : candidate ? (
                    <>
                      <p className="text-muted text-xs">
                        Not in our database yet <span className="text-off-white">{candidate.name}</span> is a real artist.
                      </p>
                      {user ? (
                        <button
                          type="button"
                          onClick={addFromMusicBrainz}
                          disabled={addingArtist}
                          className="text-accent text-sm font-semibold disabled:opacity-40"
                        >
                          {addingArtist ? 'Adding...' : `+ Add ${candidate.name}`}
                        </button>
                      ) : (
                        <p className="text-muted text-xs">
                          <Link to="/login" className="text-accent font-medium">Log in</Link> to add them
                        </p>
                      )}
                      {addError && <p className="text-red-400 text-xs">{addError}</p>}
                    </>
                  ) : (
                    <p className="text-muted text-xs">No matching artist found on MusicBrainz either</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
