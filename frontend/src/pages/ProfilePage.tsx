import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Top5Display } from '../components/Top5Display';
import { Top5Picker } from '../components/Top5Picker';
import { ArgumentThread } from '../components/ArgumentThread';
import { SignOutButton } from '../components/SignOutButton';
import { ShareProfileButton } from '../components/ShareProfileButton';
import { ProfilePhotoUpload } from '../components/ProfilePhotoUpload';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { formatArtistName } from '../utils/formatArtistName';
import type { Artist, Top5Item } from '../types';

export function ProfilePage() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const username = paramUsername || currentUser?.username;
  const isOwnProfile = !paramUsername || paramUsername === currentUser?.username;
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [arguingItem, setArguingItem] = useState<Top5Item | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('edit') !== 'top5' || !isOwnProfile) return;
    setEditing(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, isOwnProfile, setSearchParams]);
  const { data: profile } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.getUser(username!),
    enabled: !!username,
  });

  const { data: top5 } = useQuery({
    queryKey: ['top5', username],
    queryFn: () => api.getTop5(username!),
    enabled: !!username,
  });

  const voteMutation = useMutation({
    mutationFn: ({ itemId, type }: { itemId: string; type: 'like' | 'dislike' }) =>
      api.vote(itemId, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['top5', username] }),
  });

  if (!username) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-12 text-center space-y-4">
        <p className="text-muted">You're not logged in.</p>
        <Link to="/signup" className="text-accent font-medium">Create your identity</Link>
        <span className="text-muted"> or </span>
        <Link to="/login" className="text-accent font-medium">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8 pb-8">
      {profile && (
        <header className="draft-card p-5 sm:p-6 border-white/8">
          <div className="flex items-start gap-4 sm:gap-6">
            {isOwnProfile && currentUser ? (
              <ProfilePhotoUpload user={currentUser} username={profile.username} />
            ) : (
              <UserAvatar
                name={profile.name}
                profileImageUrl={profile.profile_image_url}
                size="xl"
              />
            )}

            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
<div className="flex-1 min-w-0 flex gap-4">
              <div className="min-w-0 flex-1">
                <p className="draft-label mb-1">Fan Identity</p>
                {profile.current_team_artist && (
                  <Link
                    to={`/teams/${profile.current_team_artist.id}`}
                    className="font-serif text-3xl sm:text-4xl lg:text-5xl text-warm-white hover:text-off-white transition-colors leading-none tracking-wide block"
                  >
                    Team {formatArtistName(profile.current_team_artist.name)}
                  </Link>
                )}
                <p className="text-off-white text-base sm:text-lg mt-2">@{profile.username}</p>
                {profile.city && <p className="text-muted text-xs mt-1">📍 {profile.city}</p>}
              </div>

              <div className="flex flex-col justify-between items-end shrink-0">
                {isOwnProfile && currentUser && (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => setEditing(!editing)}
                      className="text-xs font-semibold text-accent border-2 border-accent/40 px-3 py-1.5 rounded-lg hover:bg-accent/10"
                    >
                      {editing ? 'Cancel' : 'Edit Top 5'}
                    </button>
                    <SignOutButton compact className="md:hidden" />
                  </div>
                )}

                <ShareProfileButton
                  username={profile.username}
                  top5Items={top5?.items ?? []}
                  teamName={profile.current_team_artist?.name}
                />
              </div>
            </div>
            </div>
          </div>
        </header>
      )}

      <section>
        {editing && isOwnProfile ? (
          <EditTop5
            initialItems={top5?.items ?? []}
            onDone={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ['top5', username] }); }}
          />
        ) : top5 && top5.items.length > 0 ? (
          <Top5Display
            items={top5.items}
            onVote={(itemId, type) => voteMutation.mutate({ itemId, type })}
            onArgue={(item) => setArguingItem(item)}
          />
        ) : (
          <div className="draft-card p-8 text-center border-dashed border-white/15">
            <h2 className="font-serif text-2xl text-gold mb-2">Top 5</h2>
            <p className="text-muted text-sm">No Top 5 set yet</p>
            {isOwnProfile && (
              <button onClick={() => setEditing(true)} className="text-accent mt-3 text-sm font-semibold">
                Build your Top 5
              </button>
            )}
          </div>
        )}
      </section>

      {arguingItem && (
        <section className="draft-card p-4">
          <p className="text-sm text-muted mb-2">
            Reacting to <span className="text-off-white font-medium">#{arguingItem.position} {arguingItem.artist.name}</span>
          </p>
          <ArgumentThread targetType="top5_item" targetId={arguingItem.id} />
          <button onClick={() => setArguingItem(null)} className="text-muted text-xs mt-2">Close</button>
        </section>
      )}

      {profile && (
        <section>
          <p className="draft-label mb-3">Profile Reactions</p>
          <ArgumentThread targetType="profile" targetId={profile.id} />
        </section>
      )}
    </div>
  );
}

function EditTop5({ initialItems, onDone }: { initialItems: import('../types').Top5Item[]; onDone: () => void }) {
  const [selected, setSelected] = useState<Map<number, Artist>>(
    () => new Map(initialItems.map((item) => [item.position, item.artist]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (selected.size !== 5) {
      setError('Pick all 5 artists');
      return;
    }
    setSaving(true);
    try {
      const items = [...selected.entries()].map(([position, artist]) => ({
        artist_id: artist.id,
        position,
      }));
      await api.updateTop5(items);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Top5Picker selected={selected} onChange={setSelected} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={save}
        disabled={saving || selected.size !== 5}
        className="w-full btn-primary py-3 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save Top 5'}
      </button>
    </div>
  );
}
