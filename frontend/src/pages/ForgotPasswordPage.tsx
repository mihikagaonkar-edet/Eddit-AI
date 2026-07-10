import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { MusicAmbience } from '../components/music';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage">
      <MusicAmbience variant="auth" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm draft-card p-8 space-y-4"
      >
        <div className="text-center mb-4">
          <h1 className="font-headline text-6xl text-accent tracking-wide leading-none">EDDIT</h1>
          <p className="draft-label mt-4">Reset your password</p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-off-white text-sm">
              If an account exists for <span className="text-accent">{email}</span>, you'll receive a reset link shortly.
            </p>
            <Link to="/login" className="block text-sm text-muted hover:text-accent transition-colors">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="draft-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-stage mt-1"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-muted">
              <Link to="/login" className="text-accent font-semibold hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
