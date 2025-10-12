import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  className?: string;
}

export default function VisualizerCanvas({ stream, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = ctxRef.current || new AudioCtx();
    ctxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);

    const canvas = canvasRef.current;
    const c2d = canvas.getContext('2d');
    if (!c2d) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const { width, height } = canvas;
      c2d.clearRect(0, 0, width, height);
      c2d.lineWidth = 2;
      c2d.strokeStyle = '#3b82f6';
      c2d.beginPath();
      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) {
          c2d.moveTo(x, y);
        } else {
          c2d.lineTo(x, y);
        }
        x += sliceWidth;
      }
      c2d.lineTo(width, height / 2);
      c2d.stroke();
      rafRef.current = requestAnimationFrame(draw);
    };

    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {}
    };
  }, [stream]);

  return <canvas ref={canvasRef} className={className} width={800} height={160} />;
}
