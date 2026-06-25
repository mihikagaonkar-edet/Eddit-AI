import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { MusicAmbience } from '../components/music';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage">
      <MusicAmbience variant="auth" />
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-4 draft-card p-8"
      >
        <div className="text-center mb-4">
          <h1 className="font-headline text-6xl text-accent tracking-wide leading-none">EDDIT</h1>
          <p className="draft-label mt-4">Welcome back</p>
        </div>
        <div>
          <label className="draft-label">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="input-stage mt-1"
          />
        </div>
        <div>
          <label className="draft-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-stage mt-1"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full btn-primary py-3 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className="text-center text-sm text-muted">
          New here? <Link to="/signup" className="text-accent font-semibold hover:underline">Create your identity</Link>
        </p>
      </motion.form>
    </div>
  );
}
