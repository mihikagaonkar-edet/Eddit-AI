import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { TeamPatch } from '../components/TeamPatch';
import { TeamBadge } from '../components/TeamBadge';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.getTeam(id!),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.joinTeam(id!),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  if (isLoading) return <p className="p-6 text-muted">Loading...</p>;
  if (!team) return <p className="p-6 text-muted">Team not found</p>;

  const isMember = user?.current_team_artist?.id === team.artist.id;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      <div className="draft-card p-6 text-center border-white/8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center"
        >
          <TeamPatch name={team.artist.name} size="lg" />
        </motion.div>
        <p className="draft-label mt-4">Community</p>
        <h1 className="font-headline text-5xl text-accent mt-1 leading-none">Team {team.artist.name}</h1>
        {team.team_rank && (
          <p className="text-muted text-sm mt-2">
            Rank <span className="text-gold font-display text-lg">{team.team_rank}</span> among all teams
          </p>
        )}
        <p className="font-display text-6xl text-gold mt-4 rank-num">{team.member_count}</p>
        <p className="draft-label mt-1">Total Members</p>
      </div>

      {!user && (
        <Link to="/login" className="block w-full btn-primary py-3 text-center">
          Join Team {team.artist.name}
        </Link>
      )}
      {user && !isMember && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          className="w-full btn-primary py-3"
        >
          {joinMutation.isPending ? 'Joining...' : `Join Team ${team.artist.name}`}
        </motion.button>
      )}
      {user && isMember && (
        <div className="flex justify-center">
          <TeamBadge name={team.artist.name} />
        </div>
      )}

      <Section title="Newest Members">
        <div className="flex gap-3 flex-wrap">
          {team.newest_members.map((m) => (
            <Link key={m.id} to={`/profile/${m.username}`} className="text-center">
              <UserAvatar name={m.name} profileImageUrl={m.profile_image_url} size="md" />
              <p className="text-xs mt-1 max-w-[60px] truncate">{m.name}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recent Arguments">
        {team.recent_arguments.length > 0 ? (
          team.recent_arguments.map((a) => (
            <div key={a.id} className="draft-card-row p-3 mb-1.5 text-sm flex items-start gap-2">
              <UserAvatar
                name={a.author.name}
                profileImageUrl={a.author.profile_image_url}
                size="sm"
                className="mt-0.5"
              />
              <p>
                <span className="font-medium">{a.author.name}</span>: {a.text_content || '📹 Video'}
              </p>
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
      <p className="draft-label mb-3">{title}</p>
      {children}
    </section>
  );
}
