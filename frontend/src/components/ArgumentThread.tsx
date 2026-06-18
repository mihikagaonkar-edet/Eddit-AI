import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api, mediaUrl } from '../api/client';
import type { Argument } from '../types';
import { VideoRecorder } from './VideoRecorder';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';

interface Props {
  targetType: string;
  targetId: string;
}

function ArgumentCard({
  argument,
  depth = 0,
  targetType,
  targetId,
}: {
  argument: Argument;
  depth?: number;
  targetType: string;
  targetId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [text, setText] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: replies = [] } = useQuery({
    queryKey: ['replies', argument.id],
    queryFn: () => api.getReplies(argument.id),
    enabled: expanded,
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { text?: string; video_id?: string }) =>
      api.createArgument({
        target_type: targetType,
        target_id: targetId,
        text_content: data.text,
        parent_argument_id: argument.id,
        video_id: data.video_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', argument.id] });
      queryClient.invalidateQueries({ queryKey: ['arguments', targetType, targetId] });
      setReplying(false);
      setShowVideo(false);
      setText('');
      setExpanded(true);
    },
  });

  return (
    <div style={{ marginLeft: depth * 16 }} className="mt-3">
      <div className="draft-card-row p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Link to={`/profile/${argument.author.username}`} className="font-display text-sm tracking-wide hover:text-accent">
            {argument.author.name}
          </Link>
          {argument.author.current_team_artist && (
            <TeamBadge name={argument.author.current_team_artist.name} className="text-[9px] px-2 py-0.5" />
          )}
        </div>

        {argument.video && (
          <video
            src={mediaUrl(argument.video.storage_path)}
            controls
            className="w-full rounded-lg mb-2 max-h-48 object-cover"
          />
        )}
        {argument.text_content && (
          <p className="text-sm text-off-white/90">{argument.text_content}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-muted">
          {argument.reply_count > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="hover:text-accent">
              {expanded ? 'Hide' : 'Show'} {argument.reply_count} replies
            </button>
          )}
          {user && (
            <button onClick={() => setReplying(!replying)} className="hover:text-accent">
              Reply With Argument
            </button>
          )}
        </div>

        <AnimatePresence>
          {replying && user && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Make your argument..."
                className="w-full draft-card p-3 text-sm resize-none h-20 focus:outline-none focus:border-accent/40"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => replyMutation.mutate({ text })}
                  disabled={!text.trim()}
                  className="px-4 py-2 btn-primary text-sm disabled:opacity-40"
                >
                  Post Argument
                </button>
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className="px-4 py-2 btn-ghost text-sm"
                >
                  Video Argument
                </button>
              </div>
              {showVideo && (
                <VideoRecorder
                  onCancel={() => setShowVideo(false)}
                  onRecorded={async (blob, duration) => {
                    const video = await api.uploadVideo(blob, duration);
                    replyMutation.mutate({ text: text || undefined, video_id: video.id });
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expanded &&
          replies.map((r) => (
            <ArgumentCard
              key={r.id}
              argument={r}
              depth={depth + 1}
              targetType={targetType}
              targetId={targetId}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}

export function ArgumentThread({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: arguments_ = [] } = useQuery({
    queryKey: ['arguments', targetType, targetId],
    queryFn: () => api.getArguments(targetType, targetId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: { text?: string; video_id?: string }) =>
      api.createArgument({
        target_type: targetType,
        target_id: targetId,
        text_content: data.text,
        video_id: data.video_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arguments', targetType, targetId] });
      setText('');
      setShowVideo(false);
    },
  });

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-accent hover:text-accent-glow font-display tracking-wide"
      >
        {open ? 'Close Debate' : 'Start Argument'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            {user ? (
              <div className="mb-4 space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Why is this ranking wrong?"
                  className="w-full draft-card p-3 text-sm resize-none h-24 focus:outline-none focus:border-accent/40"
                />
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => createMutation.mutate({ text })}
                    disabled={!text.trim()}
                    className="px-4 py-2 btn-primary text-sm disabled:opacity-40"
                  >
                    Post Argument
                  </button>
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="px-4 py-2 btn-ghost text-sm"
                  >
                    Video Argument
                  </button>
                </div>
                {showVideo && (
                  <VideoRecorder
                    onCancel={() => setShowVideo(false)}
                    onRecorded={async (blob, duration) => {
                      const video = await api.uploadVideo(blob, duration);
                      createMutation.mutate({ text: text || undefined, video_id: video.id });
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="text-muted text-sm mb-4">
                <Link to="/login" className="text-accent">Log in</Link> to make arguments.
              </p>
            )}

            {arguments_.map((arg) => (
              <ArgumentCard
                key={arg.id}
                argument={arg}
                targetType={targetType}
                targetId={targetId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
