import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api, mediaUrl } from '../api/client';
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

      <Section title="Members">
        <div className="flex gap-3 flex-wrap">
          {team.newest_members.map((m) => (
            <Link key={m.id} to={`/profile/${m.username}`} className="text-center">
              <UserAvatar name={m.name} profileImageUrl={m.profile_image_url} size="md" />
              <p className="text-xs mt-1 max-w-[60px] truncate">{m.name}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recent Reactions">
        {team.recent_arguments.length > 0 ? (
          <div className="space-y-2">
            {team.recent_arguments.map((a) => (
              <ReactionCard key={a.id} argument={a} />
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No team reactions yet</p>
        )}
      </Section>
    </div>
  );
}

function ReactionCard({ argument: a }: { argument: import('../types').Argument }) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div
      className={`draft-card-row p-3 text-sm ${a.video ? 'cursor-pointer' : ''}`}
      onClick={a.video ? () => setVideoOpen((v) => !v) : undefined}
    >
      <div className="flex items-center gap-2">
        <UserAvatar name={a.author.name} profileImageUrl={a.author.profile_image_url} size="sm" className="shrink-0" />
        <Link
          to={`/profile/${a.author.username}`}
          className="font-medium hover:text-accent transition-colors truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {a.author.name}
        </Link>
        {a.video && (
          <span className="ml-auto text-muted text-[10px] font-display tracking-wide uppercase shrink-0">
            {videoOpen ? 'Hide ▲' : '▶ Video'}
          </span>
        )}
      </div>
      {a.text_content && <p className="text-off-white/90 mt-2">{a.text_content}</p>}
      {a.video && videoOpen && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <video
            src={mediaUrl(a.video.storage_path)}
            controls
            className="w-full rounded-lg max-h-56 object-cover"
          />
        </div>
      )}
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
