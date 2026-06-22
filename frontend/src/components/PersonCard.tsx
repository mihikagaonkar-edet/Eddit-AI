import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TeamBadge } from './TeamBadge';
import type { UserPeopleItem } from '../types';

export function PersonCard({ person }: { person: UserPeopleItem }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link
        to={`/profile/${person.username}`}
        className="flex flex-col h-full draft-card p-4 block"
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-lg border-2 border-gold/50 flex items-center justify-center font-display text-gold text-xl shrink-0"
            style={{
              background: 'linear-gradient(145deg, rgba(240,192,64,0.2), rgba(255,85,51,0.12))',
              boxShadow: '0 0 20px rgba(240,192,64,0.12)',
            }}
          >
            {person.name[0]?.toUpperCase()}
          </div>
          <p className="font-display text-sm mt-3 truncate w-full tracking-wide">{person.name}</p>
          <p className="text-muted text-xs truncate w-full">@{person.username}</p>
          {person.current_team_artist ? (
            <TeamBadge name={person.current_team_artist.name} className="mt-2 text-[9px] px-2 py-0.5" />
          ) : (
            <span className="mt-2 draft-label">No team</span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/8 flex-1">
          <p className="draft-label mb-2">Top 5</p>
          {person.top5_items.length > 0 ? (
            <div className="space-y-1">
              {person.top5_items.map((item) => (
                <div
                  key={item.position}
                  className={`flex items-center gap-1.5 text-xs leading-tight min-h-[22px] ${
                    item.position === 1 ? 'border-l-2 border-l-gold pl-1.5 -ml-0.5' : ''
                  }`}
                >
                  <span
                    className={`rank-num w-4 shrink-0 ${
                      item.position === 1 ? 'text-gold text-lg' : 'text-muted text-sm'
                    }`}
                  >
                    {item.position}
                  </span>
                  <span className="truncate font-medium">{item.artist.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-xs leading-tight">No Top 5 yet</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
