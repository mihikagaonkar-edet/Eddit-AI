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
        className={`text-sm text-muted border border-white/10 px-3 py-1.5 rounded-lg hover:text-off-white hover:bg-white/5 transition-colors ${className}`}
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-off-white hover:bg-white/5 transition-colors ${className}`}
    >
      Sign out
    </button>
  );
}
