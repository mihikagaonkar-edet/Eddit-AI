import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function TeamsPage() {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl">Teams</h1>
        <p className="text-muted text-sm mt-1">Pick your allegiance. One team. All in.</p>
      </div>

      {isLoading && <p className="text-muted">Loading...</p>}

      <div className="space-y-3">
        {teams.map((team) => (
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
    </div>
  );
}
