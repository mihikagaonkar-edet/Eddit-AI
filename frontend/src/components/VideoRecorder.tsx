import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onRecorded: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const MAX_SECONDS = 90;

function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function VideoRecorder({ onRecorded, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);

  const [phase, setPhase] = useState<'idle' | 'recording' | 'stopping' | 'preview'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [blobRef] = useState<{ current: Blob | null }>({ current: null });
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (preview) URL.revokeObjectURL(preview);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [preview]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      setPhase('stopping');
      recorder.stop();
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setError('Camera access denied. Please allow camera and microphone.');
      return;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play().catch(() => {});
    }

    chunksRef.current = [];
    secondsRef.current = 0;

    const mimeType = getSupportedMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      setError('Video recording is not supported in this browser.');
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setPhase('preview');
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.onerror = () => {
      setError('Recording error. Please try again.');
      setPhase('idle');
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(100);
    setPhase('recording');
    setSeconds(0);

    timerRef.current = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_SECONDS) {
        stopRecording();
      }
    }, 1000);
  };

  const handleUse = () => {
    if (blobRef.current) onRecorded(blobRef.current, secondsRef.current);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="draft-card p-4"
    >
      <p className="draft-label mb-2">Video Argument</p>
      <h3 className="font-display text-xl mb-3">Record Your Case</h3>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="relative aspect-video bg-black overflow-hidden mb-3 border border-white/10">
        {preview ? (
          <video src={preview} controls className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover" />
        )}
        {phase === 'recording' && (
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-600/90 px-3 py-1 text-xs font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {seconds}s / {MAX_SECONDS}s
          </div>
        )}
        {phase === 'stopping' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-sm text-off-white font-display tracking-wide">Processing…</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {phase === 'idle' && (
          <button onClick={startRecording} className="flex-1 btn-primary py-2.5">
            Start Recording
          </button>
        )}
        {phase === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Stop
          </button>
        )}
        {phase === 'stopping' && (
          <button disabled className="flex-1 btn-primary py-2.5 opacity-50 cursor-not-allowed">
            Processing…
          </button>
        )}
        {phase === 'preview' && (
          <button onClick={handleUse} className="flex-1 btn-primary py-2.5">
            Use This Video
          </button>
        )}
        <button onClick={onCancel} className="px-4 py-2.5 btn-ghost text-sm">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
