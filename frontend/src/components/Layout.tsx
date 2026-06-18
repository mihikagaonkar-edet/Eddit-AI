import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SignOutButton } from './SignOutButton';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/artists', label: 'Artists', icon: '🎤' },
  { to: '/teams', label: 'Teams', icon: '⚡' },
  { to: '/people', label: 'People', icon: '👥' },
  { to: '/rankings', label: 'Rankings', icon: '🏆' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-charcoal-light/98 backdrop-blur-lg md:hidden">
      <div className="flex justify-around py-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-white/8 bg-charcoal-light">
      <div className="p-6 border-b border-white/6">
        <h1 className="font-display text-4xl text-accent tracking-widest">EDDIT</h1>
        <p className="draft-label mt-2 normal-case tracking-wide text-xs">
          Who are your Top 5?
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent/12 text-accent border-l-2 border-l-accent'
                  : 'text-muted hover:text-off-white hover:bg-white/5'
              }`
            }
          >
            <span>{item.icon}</span>
            <span className="font-display text-sm tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/8">
        {user ? (
          <>
            <p className="px-4 py-1 text-xs text-muted truncate">@{user.username}</p>
            <SignOutButton />
          </>
        ) : (
          <Link
            to="/login"
            className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
          >
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-56 pb-20 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
