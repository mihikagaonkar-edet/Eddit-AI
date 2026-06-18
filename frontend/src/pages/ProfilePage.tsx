import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Top5Display } from '../components/Top5Display';
import { Top5Picker } from '../components/Top5Picker';
import { ArgumentThread } from '../components/ArgumentThread';
import { useAuth } from '../context/AuthContext';
import type { Artist, Top5Item } from '../types';

export function ProfilePage() {
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const username = paramUsername || currentUser?.username;
  const isOwnProfile = !paramUsername || paramUsername === currentUser?.username;
  const [editing, setEditing] = useState(false);
  const [arguingItem, setArguingItem] = useState<Top5Item | null>(null);
  const queryClient = useQueryClient();

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
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6 pb-8">
      {profile && (
        <header className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl">{profile.name}</h1>
              <p className="text-muted">@{profile.username}</p>
              {profile.city && <p className="text-sm text-muted mt-1">📍 {profile.city}</p>}
            </div>
            {isOwnProfile && currentUser && (
              <button
                onClick={() => setEditing(!editing)}
                className="text-sm text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/10"
              >
                {editing ? 'Cancel' : 'Edit Top 5'}
              </button>
            )}
          </div>
          {profile.current_team_artist && (
            <Link
              to={`/teams/${profile.current_team_artist.id}`}
              className="inline-block bg-accent/15 text-accent text-sm px-3 py-1 rounded-full font-medium"
            >
              Team {profile.current_team_artist.name}
            </Link>
          )}
        </header>
      )}

      <section>
        <h2 className="font-display text-2xl mb-4 tracking-wide">Top 5</h2>
        {editing && isOwnProfile ? (
          <EditTop5 onDone={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ['top5', username] }); }} />
        ) : top5 && top5.items.length > 0 ? (
          <Top5Display
            items={top5.items}
            onVote={(itemId, type) => voteMutation.mutate({ itemId, type })}
            onArgue={(item) => setArguingItem(item)}
          />
        ) : (
          <div className="bg-charcoal-card rounded-2xl p-8 text-center border border-dashed border-white/15">
            <p className="text-muted">No Top 5 set yet</p>
            {isOwnProfile && (
              <button onClick={() => setEditing(true)} className="text-accent mt-2 text-sm font-medium">
                Build your Top 5
              </button>
            )}
          </div>
        )}
      </section>

      {arguingItem && (
        <section className="bg-charcoal-card rounded-2xl p-4 border border-white/10">
          <p className="text-sm text-muted mb-2">
            Arguing about <span className="text-off-white font-medium">#{arguingItem.position} {arguingItem.artist.name}</span>
          </p>
          <ArgumentThread targetType="top5_item" targetId={arguingItem.id} />
          <button onClick={() => setArguingItem(null)} className="text-muted text-xs mt-2">Close</button>
        </section>
      )}

      {profile && (
        <section>
          <h2 className="font-display text-xl mb-3">Profile Arguments</h2>
          <ArgumentThread targetType="profile" targetId={profile.id} />
        </section>
      )}
    </div>
  );
}

function EditTop5({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<Map<number, Artist>>(new Map());
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
        className="w-full bg-accent hover:bg-accent-glow text-white font-medium py-3 rounded-xl disabled:opacity-40 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Top 5'}
      </button>
    </div>
  );
}
