import { useRef } from 'react';
import { UserAvatar } from './UserAvatar';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function ProfilePhotoField({
  name,
  file,
  previewUrl,
  onChange,
  disabled,
}: {
  name: string;
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onChange(picked);
    e.target.value = '';
  };

  return (
    <div>
      <label className="draft-label">Profile photo (optional)</label>
      <div className="mt-2 flex items-center gap-4">
        <UserAvatar
          name={name || '?'}
          profileImageUrl={previewUrl}
          size="lg"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="text-xs font-semibold text-accent border-2 border-accent/40 px-3 py-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-50"
          >
            {file ? 'Choose different photo' : 'Choose photo'}
          </button>
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-xs text-muted hover:text-off-white disabled:opacity-50 text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
