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
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl">Teams</h1>
        <p className="text-muted text-sm mt-1">Pick your allegiance. One team. All in.</p>
      </div>

      <input
        type="search"
        placeholder="Search teams by artist name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-accent/50"
      />

      {isLoading && <p className="text-muted">Loading...</p>}

      {!isLoading && (
        <>
          <p className="text-muted text-sm">
            {filtered.length} team{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-3">
            {filtered.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="flex items-center gap-4 bg-charcoal-card rounded-2xl p-4 border border-white/8 hover:border-accent/30 transition-all"
              >
                <ArtistAvatar name={team.name} size="lg" />
                <div>
                  <p className="font-display text-xl text-accent">Team {team.name}</p>
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
