import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ArtistAvatar } from '../components/ArtistAvatar';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.getTeam(id!),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.joinTeam(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  if (isLoading) return <p className="p-6 text-muted">Loading...</p>;
  if (!team) return <p className="p-6 text-muted">Team not found</p>;

  const isMember = user?.current_team_artist?.id === team.artist.id;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center"
        >
          <ArtistAvatar name={team.artist.name} size="lg" />
        </motion.div>
        <h1 className="font-display text-4xl text-accent mt-4">Team {team.artist.name}</h1>
        {team.team_rank && (
          <p className="text-muted mt-1">Ranked #{team.team_rank} among all teams</p>
        )}
        <p className="font-display text-3xl mt-4">{team.member_count}</p>
        <p className="text-muted text-sm">Total Members</p>
      </div>

      {!isMember && user && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          className="w-full bg-accent hover:bg-accent-glow text-white font-medium py-3 rounded-xl transition-colors"
        >
          {joinMutation.isPending ? 'Joining...' : `Join Team ${team.artist.name}`}
        </motion.button>
      )}
      {isMember && (
        <p className="text-center text-accent font-medium">You're on this team ⚡</p>
      )}

      <Section title="Newest Members">
        <div className="flex gap-3 flex-wrap">
          {team.newest_members.map((m) => (
            <Link key={m.id} to={`/profile/${m.username}`} className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-display text-accent">
                {m.name[0]}
              </div>
              <p className="text-xs mt-1 max-w-[60px] truncate">{m.name}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recent Arguments">
        {team.recent_arguments.length > 0 ? (
          team.recent_arguments.map((a) => (
            <div key={a.id} className="bg-charcoal-card rounded-xl p-3 mb-2 text-sm">
              <span className="font-medium">{a.author.name}</span>: {a.text_content || '📹 Video'}
            </div>
          ))
        ) : (
          <p className="text-muted text-sm">No team arguments yet</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      {children}
    </section>
  );
}
