import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { MusicAmbience } from '../components/music';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      navigate('/login?reset=1');
    } catch {
      setError('This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-stage">
        <MusicAmbience variant="auth" />
        <div className="relative z-10 w-full max-w-sm draft-card p-8 text-center space-y-4">
          <p className="text-red-400">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-accent hover:underline text-sm">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-stage">
      <MusicAmbience variant="auth" />
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm draft-card p-8 space-y-4"
      >
        <div className="text-center mb-4">
          <h1 className="font-headline text-6xl text-accent tracking-wide leading-none">EDDIT</h1>
          <p className="draft-label mt-4">Set a new password</p>
        </div>
        <div>
          <label className="draft-label">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input-stage mt-1"
          />
        </div>
        <div>
          <label className="draft-label">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="input-stage mt-1"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Set new password'}
        </button>
        <p className="text-center text-sm text-muted">
          <Link to="/login" className="text-accent font-semibold hover:underline">Back to login</Link>
        </p>
      </motion.form>
    </div>
  );
}
