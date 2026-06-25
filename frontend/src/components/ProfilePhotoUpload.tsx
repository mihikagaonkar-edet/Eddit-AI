import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import type { User } from '../types';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function ProfilePhotoUpload({
  user,
  username,
}: {
  user: User;
  username: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadProfilePhoto(file),
    onSuccess: async () => {
      setError('');
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user', username] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Upload failed');
    },
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  const hasPhoto = !!user.profile_image_url;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="group relative rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-60 cursor-pointer"
        aria-label={hasPhoto ? 'Change profile photo' : 'Upload profile photo'}
      >
        <UserAvatar
          name={user.name}
          profileImageUrl={user.profile_image_url}
          size="xl"
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-off-white">
          {uploadMutation.isPending ? 'Uploading…' : hasPhoto ? 'Change photo' : 'Add photo'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
      />
      {error && <p className="text-red-400 text-xs mt-1 max-w-[96px]">{error}</p>}
    </div>
  );
}
