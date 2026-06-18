import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  className?: string;
  compact?: boolean;
}

export function SignOutButton({ className = '', compact = false }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={`text-xs font-semibold draft-label border border-white/15 px-3 py-1.5 hover:text-off-white hover:border-white/30 transition-colors ${className}`}
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`w-full text-left px-4 py-3 text-sm font-medium text-muted hover:text-off-white hover:bg-white/5 transition-colors border-t border-white/5 ${className}`}
    >
      Sign out
    </button>
  );
}
