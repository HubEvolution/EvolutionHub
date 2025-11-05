import { useEffect, useRef } from 'react';

type Props = {
  className?: string;
};

export default function EchoAvatars({ className = '' }: Props) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const a1 = useRef<HTMLDivElement | null>(null);
  const a2 = useRef<HTMLDivElement | null>(null);
  const a3 = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReduced) return;
  }, [prefersReduced]);

  return (
    <div className={'absolute inset-0 pointer-events-none ' + className} aria-hidden="true">
      <div
        ref={a1}
        className="hidden md:block absolute w-16 h-16 rounded-full border-2 border-cyan-400/60 shadow-[0_0_0_4px_rgba(34,211,238,0.08)] echo-float echo-float-1"
        style={{ right: '8%', top: '22%' }}
      />
      <div
        ref={a2}
        className="hidden md:block absolute w-12 h-12 rounded-full border-2 border-fuchsia-400/60 shadow-[0_0_0_4px_rgba(232,121,249,0.08)] echo-float echo-float-2"
        style={{ left: '12%', top: '48%' }}
      />
      <div
        ref={a3}
        className="hidden md:block absolute w-10 h-10 rounded-full border-2 border-emerald-400/60 shadow-[0_0_0_4px_rgba(52,211,153,0.08)] echo-float echo-float-3"
        style={{ right: '20%', bottom: '10%' }}
      />
    </div>
  );
}
