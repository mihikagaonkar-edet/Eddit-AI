import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onRecorded: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const MAX_SECONDS = 90;

export function VideoRecorder({ onRecorded, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
    } catch {
      setError('Camera access denied. Please allow camera and microphone.');
    }
  }, []);

  const startRecording = async () => {
    await startCamera();
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(100);
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s >= MAX_SECONDS - 1) {
          stopRecording();
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleUse = () => {
    if (blob) onRecorded(blob, seconds);
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
        {recording && (
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-600/90 px-3 py-1 text-xs font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {seconds}s / {MAX_SECONDS}s
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!recording && !blob && (
          <button onClick={startRecording} className="flex-1 btn-primary py-2.5">
            Start Recording
          </button>
        )}
        {recording && (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Stop
          </button>
        )}
        {blob && (
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
