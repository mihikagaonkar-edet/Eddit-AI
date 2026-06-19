import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatArtistName } from '../utils/formatArtistName';
import type { Top5Item } from '../types';

interface Props {
  username: string;
  top5Items?: Top5Item[];
  teamName?: string | null;
  className?: string;
  fullWidth?: boolean;
}

const MENU_WIDTH = 208;

function buildShareContent(username: string, top5Items: Top5Item[], teamName?: string | null) {
  const url = `${window.location.origin}/profile/${username}`;
  const sorted = [...top5Items].sort((a, b) => a.position - b.position);
  const top5Lines = sorted.map((item) => `${item.position}. ${formatArtistName(item.artist.name)}`);

  let text = `My Top 5 on Eddit (@${username})`;
  if (top5Lines.length > 0) {
    text += `\n\n${top5Lines.join('\n')}`;
  }
  if (teamName) {
    text += `\n\nTeam ${formatArtistName(teamName)}`;
  }
  text += `\n\n${url}`;

  const title = `@${username}'s Top 5 on Eddit`;
  const tweetText =
    top5Lines.length > 0
      ? `My Top 5 on Eddit: ${sorted.map((i) => formatArtistName(i.artist.name)).join(', ')}`
      : `Check out my profile on Eddit (@${username})`;

  return { url, text, title, tweetText };
}

const PLATFORMS = [
  {
    id: 'copy',
    label: 'Copy link',
    icon: '🔗',
    getHref: () => null,
  },
  {
    id: 'native',
    label: 'Share…',
    icon: '📤',
    getHref: () => null,
  },
  {
    id: 'x',
    label: 'X / Twitter',
    icon: '𝕏',
    getHref: (url: string, tweetText: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: 'f',
    getHref: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'in',
    getHref: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    getHref: (_url: string, _tweet: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    icon: '↗',
    getHref: (url: string, _tweet: string, _text: string, title: string) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
] as const;

export function ShareProfileButton({
  username,
  top5Items = [],
  teamName,
  className = '',
  fullWidth = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const { url, text, title, tweetText } = buildShareContent(username, top5Items, teamName);

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
      setOpen(false);
    } catch {
      /* user cancelled */
    }
  };

  const handlePlatform = (platform: (typeof PLATFORMS)[number]) => {
    if (platform.id === 'copy') {
      void handleCopy();
      return;
    }
    if (platform.id === 'native') {
      void handleNativeShare();
      return;
    }
    const href = platform.getHref(url, tweetText, text, title);
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
      setOpen(false);
    }
  };

  const visiblePlatforms = PLATFORMS.filter(
    (p) => p.id !== 'native' || canNativeShare
  );

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
          className="fixed z-[9999] bg-charcoal-card border border-white/10 rounded-lg shadow-2xl py-1.5"
        >
          <p className="draft-label px-3 py-1.5 border-b border-white/8 mb-1">Share profile</p>
          {visiblePlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => handlePlatform(platform)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-off-white hover:bg-white/5 transition-colors text-left"
            >
              <span className="w-5 text-center text-accent">{platform.icon}</span>
              <span>{platform.id === 'copy' && copied ? 'Copied!' : platform.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((v) => !v);
        }}
        className={`text-xs font-semibold text-accent border-2 border-accent/40 px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      >
        Share
      </button>
      {menu}
    </>
  );
}
