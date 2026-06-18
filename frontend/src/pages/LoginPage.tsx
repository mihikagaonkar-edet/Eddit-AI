import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 draft-card p-6">
        <div className="text-center mb-2">
          <h1 className="font-display text-5xl text-accent tracking-widest">EDDIT</h1>
          <p className="draft-label mt-3">Welcome back</p>
        </div>
        <div>
          <label className="draft-label">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full mt-1 draft-card px-4 py-2.5 text-sm focus:outline-none focus:border-accent/40"
          />
        </div>
        <div>
          <label className="draft-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mt-1 draft-card px-4 py-2.5 text-sm focus:outline-none focus:border-accent/40"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full btn-primary py-3 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className="text-center text-sm text-muted">
          New here? <Link to="/signup" className="text-accent font-medium">Create your identity</Link>
        </p>
      </form>
    </div>
  );
}
