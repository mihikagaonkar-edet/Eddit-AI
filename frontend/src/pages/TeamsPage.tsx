import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function TeamsPage() {
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => team.name.toLowerCase().includes(q));
  }, [teams, search]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6 pb-8">
      <header className="page-header">
        <p className="draft-label">Allegiance</p>
        <h1 className="font-headline text-5xl text-off-white mt-1">Teams</h1>
        <p className="text-muted text-sm mt-2">Pick your artist. One team. All in.</p>
      </header>

      <input
        type="search"
        placeholder="Search teams by artist name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-stage"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} team{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-1.5">
            {filtered.map((team, i) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className={`flex items-center gap-4 p-4 transition-colors hover:border-accent/30 ${
                  i === 0 ? 'draft-card-hero' : 'draft-card-row'
                }`}
              >
                <ArtistAvatar name={team.name} size="lg" />
                <div>
                  <p className="font-display text-xl text-accent tracking-wide">Team {team.name}</p>
                  {team.rating != null && (
                    <p className="text-gold text-sm">★ {team.rating}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted text-center py-8">No teams found</p>
          )}
        </>
      )}
    </div>
  );
}
