import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api, mediaUrl } from '../api/client';
import type { Argument } from '../types';
import { VideoRecorder } from './VideoRecorder';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';
import { UserAvatar } from './UserAvatar';

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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: replies = [] } = useQuery({
    queryKey: ['replies', argument.id],
    queryFn: () => api.getReplies(argument.id),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteArgument(argument.id),
    onMutate: () => {
      const listKey = argument.parent_argument_id
        ? ['replies', argument.parent_argument_id]
        : ['arguments', targetType, targetId];
      queryClient.setQueryData<Argument[]>(listKey, (prev) =>
        prev ? prev.filter((a) => a.id !== argument.id) : prev
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['arguments', targetType, targetId] });
      if (argument.parent_argument_id) {
        queryClient.invalidateQueries({ queryKey: ['replies', argument.parent_argument_id] });
      }
    },
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
          <Link to={`/profile/${argument.author.username}`} className="shrink-0">
            <UserAvatar
              name={argument.author.name}
              profileImageUrl={argument.author.profile_image_url}
              size="sm"
            />
          </Link>
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
              Reply With Reaction
            </button>
          )}
          {user?.id === argument.author.id && (
            <>
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleteMutation.isPending}
                className="hover:text-red-400 transition-colors disabled:opacity-40 ml-auto"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
              {confirmingDelete && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(8, 7, 10, 0.75)', backdropFilter: 'blur(4px)' }}
                  onClick={() => setConfirmingDelete(false)}
                >
                  <div
                    className="draft-card p-6 w-full max-w-sm flex flex-col gap-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="draft-label mb-1">Confirm deletion</p>
                      <h3 className="font-display text-xl tracking-wide">Delete this reaction?</h3>
                      <p className="text-muted text-sm mt-1">This cannot be undone.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setConfirmingDelete(false); deleteMutation.mutate(); }}
                        className="flex-1 py-2.5 font-display tracking-wide text-sm uppercase bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(false)}
                        className="flex-1 py-2.5 btn-ghost text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
                placeholder="Make your reaction..."
                className="w-full draft-card p-3 text-sm resize-none h-20 focus:outline-none focus:border-accent/40"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => replyMutation.mutate({ text })}
                  disabled={!text.trim()}
                  className="px-4 py-2 btn-primary text-sm disabled:opacity-40"
                >
                  Post Reaction
                </button>
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className="px-4 py-2 btn-ghost text-sm"
                >
                  Video Reaction
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
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: arguments_ = [] } = useQuery({
    queryKey: ['arguments', targetType, targetId],
    queryFn: () => api.getArguments(targetType, targetId),
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
      setComposing(false);
    },
  });

  return (
    <div>
      {user ? (
        <button
          onClick={() => setComposing(!composing)}
          className="text-sm text-accent hover:text-accent-glow font-display tracking-wide"
        >
          {composing ? 'Cancel' : 'React to this profile'}
        </button>
      ) : (
        <p className="text-muted text-sm">
          <Link to="/login" className="text-accent">Log in</Link> to react.
        </p>
      )}

      <AnimatePresence>
        {composing && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
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
                Post Reaction
              </button>
              <button
                onClick={() => setShowVideo(!showVideo)}
                className="px-4 py-2 btn-ghost text-sm"
              >
                Video Reaction
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4">
        {arguments_.map((arg) => (
          <ArgumentCard
            key={arg.id}
            argument={arg}
            targetType={targetType}
            targetId={targetId}
          />
        ))}
      </div>
    </div>
  );
}
