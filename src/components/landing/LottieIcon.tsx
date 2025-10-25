import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

type Props = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  ariaLabel?: string;
  onErrorFallback?: () => JSX.Element;
};

export default function LottieIcon({
  src,
  className = '',
  loop = true,
  autoplay = true,
  ariaLabel,
  onErrorFallback,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  // IO: gate rendering/playback by visibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible(entries[0]?.isIntersecting ?? false);
      },
      { rootMargin: '100px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;

    async function load() {
      try {
        if (!visible || reduced) return; // defer heavy work until visible
        const [{ default: lottie }, res] = await Promise.all([
          import('lottie-web/build/player/lottie_light'),
          fetch(src),
        ]);
        if (!res.ok) throw new Error('lottie fetch failed');
        const data = await res.json();
        if (cancelled) return;
        animRef.current = lottie.loadAnimation({
          container: container as unknown as Element,
          renderer: 'svg',
          loop: reduced ? false : loop,
          autoplay: reduced ? false : autoplay,
          animationData: data,
          rendererSettings: { progressiveLoad: true },
        });
        if (reduced && animRef.current) {
          try {
            animRef.current.goToAndStop(0, true);
          } catch {}
        }
      } catch (e) {
        setFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [src, loop, autoplay, visible]);

  // Pause/resume on visibility change
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = animRef.current;
    if (!anim) return;
    try {
      if (!visible || reduced) {
        anim.pause?.();
      } else {
        if (autoplay) anim.play?.();
      }
    } catch {}
  }, [visible, autoplay]);

  if (failed && onErrorFallback) {
    return onErrorFallback();
  }

  return (
    <div
      ref={ref}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    />
  );
}
