import { Link } from 'react-router-dom';
import { TeamBadge } from './TeamBadge';
import type { UserPeopleItem } from '../types';

export function PersonCard({ person }: { person: UserPeopleItem }) {
  return (
    <Link
      to={`/profile/${person.username}`}
      className="flex flex-col h-full draft-card p-3 hover:border-accent/30 transition-colors"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-10 h-10 border-2 border-gold/40 bg-charcoal-light flex items-center justify-center font-display text-gold text-lg shrink-0">
          {person.name[0]?.toUpperCase()}
        </div>
        <p className="font-display text-sm mt-2 truncate w-full tracking-wide">{person.name}</p>
        <p className="text-muted text-xs truncate w-full">@{person.username}</p>
        {person.current_team_artist ? (
          <TeamBadge name={person.current_team_artist.name} className="mt-2 text-[9px] px-2 py-0.5" />
        ) : (
          <span className="mt-2 draft-label">No team</span>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex-1">
        <p className="draft-label mb-1.5">Top 5</p>
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
                  className={`font-display w-4 shrink-0 ${
                    item.position === 1 ? 'text-gold text-base' : 'text-muted text-sm'
                  }`}
                >
                  {item.position}
                </span>
                <span className="truncate">{item.artist.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-xs leading-tight">No Top 5 yet</p>
        )}
      </div>
    </Link>
  );
}
