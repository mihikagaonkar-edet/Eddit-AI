import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Top5Picker } from '../components/Top5Picker';
import { api } from '../api/client';
import type { Artist } from '../types';
import { ArtistAvatar } from '../components/ArtistAvatar';

type Step = 'account' | 'top5' | 'team';

export function SignupPage() {
  const [step, setStep] = useState<Step>('account');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', city: '' });
  const [selected, setSelected] = useState<Map<number, Artist>>(new Map());
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, refreshUser } = useAuth();
  const navigate = useNavigate();

  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists(0, 100),
    enabled: step === 'team',
  });

  const handleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      setStep('top5');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTop5 = async () => {
    if (selected.size !== 5) {
      setError('Pick all 5 artists');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const items = [...selected.entries()].map(([position, artist]) => ({
        artist_id: artist.id,
        position,
      }));
      await api.updateTop5(items);
      setStep('team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Top 5');
    } finally {
      setLoading(false);
    }
  };

  const handleTeam = async () => {
    if (!teamId) {
      setError('Pick a team');
      return;
    }
    setLoading(true);
    try {
      await api.joinTeam(teamId);
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const steps: Step[] = ['account', 'top5', 'team'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-accent">EDDIT</h1>
          <p className="text-muted mt-2">Show us your Top 5.</p>
        </div>

        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${i <= stepIndex ? 'bg-accent' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'account' && (
            <motion.form
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleAccount}
              className="space-y-4"
            >
              <h2 className="font-display text-2xl">Create Account</h2>
              <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Input label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
              <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-accent py-3 rounded-xl font-medium disabled:opacity-50">
                {loading ? 'Creating...' : 'Continue'}
              </button>
              <p className="text-center text-sm text-muted">
                Have an account? <Link to="/login" className="text-accent">Log in</Link>
              </p>
            </motion.form>
          )}

          {step === 'top5' && (
            <motion.div
              key="top5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="font-display text-2xl">Select Your Top 5</h2>
              <p className="text-muted text-sm">This is your identity. Choose wisely.</p>
              <Top5Picker selected={selected} onChange={setSelected} />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleTop5} disabled={loading} className="w-full bg-accent py-3 rounded-xl font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </motion.div>
          )}

          {step === 'team' && (
            <motion.div
              key="team"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="font-display text-2xl">Join a Team</h2>
              <p className="text-muted text-sm">Pick your artist allegiance.</p>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {artists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => setTeamId(artist.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left text-sm border transition-colors ${
                      teamId === artist.id
                        ? 'border-accent bg-accent/15'
                        : 'border-white/10 bg-charcoal-card hover:border-white/20'
                    }`}
                  >
                    <ArtistAvatar name={artist.name} size="sm" />
                    <span className="truncate">Team {artist.name}</span>
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleTeam} disabled={loading} className="w-full bg-accent py-3 rounded-xl font-medium disabled:opacity-50">
                {loading ? 'Joining...' : 'Enter Eddit'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full mt-1 bg-charcoal-card border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50"
      />
    </div>
  );
}
