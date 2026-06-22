import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SignOutButton } from './SignOutButton';

const navItems = [
  { to: '/', label: 'Home', Icon: IconHome },
  { to: '/artists', label: 'Artists', Icon: IconMic },
  { to: '/teams', label: 'Teams', Icon: IconBolt },
  { to: '/people', label: 'People', Icon: IconCrowd },
  { to: '/rankings', label: 'Rankings', Icon: IconTrophy },
  { to: '/profile', label: 'Profile', Icon: IconProfile },
];

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a7 7 0 01-14 0M12 18v3" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
    </svg>
  );
}

function IconCrowd({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <path d="M14 20c0-2.2 1.8-4 4-4" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 4h8v3a4 4 0 01-8 0V4zM5 4h3M16 4h3M5 4v2a3 3 0 003 3M19 4v2a3 3 0 01-3 3" />
      <path d="M12 11v3M9 20h6M10 14h4v3a2 2 0 01-4 0v-3z" />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-stage md:hidden">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-1 text-[9px] font-display tracking-wider transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <item.Icon className="w-5 h-5" />
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
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 sidebar-stage">
      <div className="p-6 border-b border-white/6">
        <div className="flex items-center gap-2">
          <span className="live-dot" aria-hidden />
          <p className="draft-label normal-case tracking-widest text-[9px]">Live</p>
        </div>
        <h1 className="font-headline text-5xl text-accent mt-3 leading-none">EDDIT</h1>
        <p className="draft-label mt-2 normal-case tracking-wide text-xs text-muted">
          Who are your Top 5?
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'nav-active-glow text-accent'
                  : 'text-muted hover:text-off-white hover:bg-white/5'
              }`
            }
          >
            <item.Icon className="w-5 h-5 shrink-0" />
            <span className="font-display text-sm tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/8">
        {user ? (
          <>
            <p className="px-2 py-1 text-xs text-muted truncate font-display tracking-wide">
              @{user.username}
            </p>
            <SignOutButton />
          </>
        ) : (
          <Link
            to="/login"
            className="block px-4 py-3 rounded-lg text-sm font-display tracking-wider font-bold text-accent hover:bg-accent/10 transition-colors border border-accent/25"
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
      <main className="md:ml-60 pb-24 md:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
