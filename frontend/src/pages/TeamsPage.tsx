import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function TeamsPage() {
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
  });

  // Build a rank map from top_teams order (1-based)
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [i, t] of (rankings?.top_teams ?? []).entries()) {
      map.set(String(t.id), i + 1);
    }
    return map;
  }, [rankings?.top_teams]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? teams.filter((t) => t.name.toLowerCase().includes(q))
      : [...teams];

    return filtered.sort((a, b) => {
      const ra = rankMap.get(String(a.id)) ?? Infinity;
      const rb = rankMap.get(String(b.id)) ?? Infinity;
      return ra - rb;
    });
  }, [teams, search, rankMap]);

  const isLoading = teamsLoading || rankingsLoading;

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
            {sorted.length} team{sorted.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-1.5">
            {sorted.map((team) => {
              const rank = rankMap.get(String(team.id));
              const isTop = rank === 1;
              return (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className={`flex items-center gap-4 p-4 transition-colors hover:border-accent/30 ${
                    isTop ? 'draft-card-hero' : 'draft-card-row'
                  }`}
                >
                  {rank != null ? (
                    <span
                      className={`rank-num text-2xl w-8 shrink-0 text-right ${
                        rank === 1 ? 'text-gold' : rank <= 3 ? 'text-accent' : 'text-muted'
                      }`}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="w-8 shrink-0" />
                  )}
                  <ArtistAvatar name={team.name} imageUrl={team.image_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xl text-accent tracking-wide">Team {team.name}</p>
                    {team.rating != null && (
                      <p className="text-gold text-sm">★ {team.rating}</p>
                    )}
                  </div>
                  {rank != null && rank <= 3 && (
                    <span className="draft-label text-gold shrink-0">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          {sorted.length === 0 && (
            <p className="text-muted text-center py-8">No teams found</p>
          )}
        </>
      )}
    </div>
  );
}
