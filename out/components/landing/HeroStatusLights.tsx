import { useEffect, useMemo, useState } from 'react';

type Labels = {
  infra: string;
  image: string;
  prompt: string;
  voice: string;
  web: string;
  video: string;
};

type Props = {
  labels: Labels;
  icons?: Partial<Record<keyof Labels, string>>;
  refreshMs?: number;
  iconsOnly?: boolean;
};

type StatusMap = {
  infra: boolean | null;
  image: boolean | null;
  prompt: boolean | null;
  voice: boolean | null;
  web: boolean | null;
  video: boolean | null;
};

type ApiEnvelope = { success: boolean; data?: unknown };
async function isOk(res: Response) {
  if (!res.ok) return false;
  try {
    const raw: unknown = await res.json();
    if (raw && typeof raw === 'object' && 'success' in raw) {
      const env = raw as ApiEnvelope & { data?: { status?: unknown } };
      if (!env.success) return false;
      const stat = env.data && (env.data as { status?: unknown }).status;
      if (typeof stat === 'string') {
        return stat.toLowerCase() === 'ok';
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function HeroStatusLights({
  labels,
  icons,
  refreshMs = 180000,
  iconsOnly = false,
}: Props) {
  const [status, setStatus] = useState<StatusMap>({
    infra: null,
    image: null,
    prompt: null,
    voice: null,
    web: null,
    video: null,
  });

  const endpoints = useMemo(() => {
    const prefix =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/en/') ? '/en' : '';
    return {
      infra: '/api/health',
      image: '/api/ai-image/usage',
      prompt: '/api/prompt/usage',
      voice: '/api/voice/usage',
      // Probe the tool app route for availability (UI-level liveness for Webscraper)
      web: `${prefix}/tools/webscraper/app`,
      // Probe the tool app route for availability (UI-level liveness for Video Enhancer)
      video: `${prefix}/tools/video-enhancer/app`,
    } as const;
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const [infraRes, imageRes, promptRes, voiceRes, webRes, videoRes] =
          await Promise.allSettled([
            fetch(endpoints.infra, { method: 'GET', credentials: 'same-origin' }),
            fetch(endpoints.image, { method: 'GET', credentials: 'same-origin' }),
            fetch(endpoints.prompt, { method: 'GET', credentials: 'same-origin' }),
            fetch(endpoints.voice, { method: 'GET', credentials: 'same-origin' }),
            fetch(endpoints.web, { method: 'GET', credentials: 'same-origin' }),
            fetch(endpoints.video, { method: 'GET', credentials: 'same-origin' }),
          ]);

        const toBoolWithKey = async (
          key: keyof typeof endpoints,
          r: PromiseSettledResult<Response>
        ) => {
          if (r.status !== 'fulfilled') return false;
          if (key === 'web' || key === 'video') {
            // Webscraper probe is an HTML page; treat HTTP 200 as OK
            return r.value.ok;
          }
          return isOk(r.value);
        };

        const [infraOk, imageOk, promptOk, voiceOk, webOk, videoOk] = await Promise.all([
          toBoolWithKey('infra', infraRes),
          toBoolWithKey('image', imageRes),
          toBoolWithKey('prompt', promptRes),
          toBoolWithKey('voice', voiceRes),
          toBoolWithKey('web', webRes),
          toBoolWithKey('video', videoRes),
        ]);

        if (mounted)
          setStatus({
            infra: infraOk,
            image: imageOk,
            prompt: promptOk,
            voice: voiceOk,
            web: webOk,
            video: videoOk,
          });
      } catch {
        if (mounted)
          setStatus({
            infra: false,
            image: false,
            prompt: false,
            voice: false,
            web: false,
            video: false,
          });
      }
    };

    fetchAll();
    const id = window.setInterval(fetchAll, Math.max(120000, refreshMs || 0));
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [endpoints, refreshMs]);

  const items = [
    { key: 'infra' as const, label: labels.infra, value: status.infra },
    { key: 'image' as const, label: labels.image, value: status.image },
    { key: 'prompt' as const, label: labels.prompt, value: status.prompt },
    { key: 'voice' as const, label: labels.voice, value: status.voice },
    { key: 'web' as const, label: labels.web, value: status.web },
    { key: 'video' as const, label: labels.video, value: status.video },
  ];

  const colorClass = (v: boolean | null) => {
    if (v === true)
      return 'bg-emerald-400 ring ring-emerald-300/40 shadow-[0_0_10px_2px_rgba(16,185,129,0.35)]';
    if (v === false)
      return 'bg-rose-500 ring ring-rose-300/40 shadow-[0_0_10px_2px_rgba(244,63,94,0.35)]';
    return 'bg-gray-400 ring ring-gray-300/50 animate-pulse';
  };

  // Low glow handled via shared landing-holo-bg

  const textClass = (v: boolean | null) => {
    if (v === true) return 'text-emerald-600 dark:text-emerald-300';
    if (v === false) return 'text-rose-600 dark:text-rose-300';
    return 'text-gray-600 dark:text-gray-300';
  };

  function getToolHref(name: 'infra' | 'image' | 'prompt' | 'voice' | 'web' | 'video') {
    const prefix =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/en/') ? '/en' : '';
    if (name === 'image') return `${prefix}/tools/imag-enhancer/app`;
    if (name === 'prompt') return `${prefix}/tools/prompt-enhancer/app`;
    if (name === 'voice') return `${prefix}/tools/voice-visualizer/app`;
    if (name === 'web') return `${prefix}/tools/webscraper/app`;
    if (name === 'video') return `${prefix}/tools/video-enhancer/app`;
    return undefined;
  }

  function ToolIcon({
    name,
    titleText,
  }: {
    name: 'infra' | 'image' | 'prompt' | 'voice' | 'web' | 'video';
    titleText?: string;
  }) {
    const cls = `w-[52px] h-[52px] opacity-95 icon-bright`;
    const custom = icons?.[name];
    // If a custom icon name is provided via props, render a generic path using data-icon attr for CSS/Lottie bridges.
    // We keep the inline SVG fallbacks for when no icon override is passed.
    if (custom && custom !== 'default') {
      const known = custom.toLowerCase();
      if (known.includes('image') || known === 'imag' || known === 'photo' || known === 'gallery')
        name = 'image';
      else if (
        known.includes('prompt') ||
        known === 'magic' ||
        known === 'pencil' ||
        known === 'edit'
      )
        name = 'prompt';
      else if (
        known.includes('voice') ||
        known === 'mic' ||
        known === 'microphone' ||
        known === 'audio'
      )
        name = 'voice';
      else if (
        known.includes('web') ||
        known.includes('scrape') ||
        known === 'globe' ||
        known === 'search'
      )
        name = 'web';
      else if (known.includes('video') || known === 'film' || known === 'play') name = 'video';
      else if (
        known.includes('infra') ||
        known.includes('server') ||
        known.includes('cloud') ||
        known === 'cpu'
      )
        name = 'infra';
      else {
        return (
          <svg
            className={`${cls} text-slate-300`}
            width={52}
            height={52}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
            data-icon={custom}
          >
            {titleText ? <title>{titleText}</title> : null}
            <circle cx="12" cy="12" r="9" strokeWidth="1.75" opacity="0.35" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.85"
              d="M8 12h8M12 8v8"
            />
          </svg>
        );
      }
    }
    if (name === 'image') {
      return (
        <svg
          className={`${cls} text-emerald-300`}
          width={52}
          height={52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          {titleText ? <title>{titleText}</title> : null}
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.85" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.85"
            d="M7 14l3-3 3 2 3-3 4 4"
          />
          <circle cx="8.5" cy="9" r="1.6" strokeWidth="1.6" />
        </svg>
      );
    }
    if (name === 'prompt') {
      return (
        <svg
          className={`${cls} text-cyan-300`}
          width={52}
          height={52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          {titleText ? <title>{titleText}</title> : null}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.85" d="M4 20l9-9" />
          <rect
            x="11.2"
            y="7.8"
            width="3.2"
            height="1.6"
            rx="0.5"
            transform="rotate(45 11.2 7.8)"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M15.5 4.5v2M15.5 3.5v0M14.5 5.5h2"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M19 8.5v2M18 9.5h2"
          />
        </svg>
      );
    }
    if (name === 'voice') {
      return (
        <svg
          className={`${cls} text-indigo-300`}
          width={52}
          height={52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          {titleText ? <title>{titleText}</title> : null}
          <rect x="9" y="4" width="6" height="10" rx="3" strokeWidth="1.85" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.85"
            d="M6 11a6 6 0 0012 0"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M4.8 9.5c-1.2 1.2-1.2 3.8 0 5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M19.2 9.5c1.2 1.2 1.2 3.8 0 5"
          />
        </svg>
      );
    }
    if (name === 'web') {
      return (
        <svg
          className={`${cls} text-amber-300`}
          width={52}
          height={52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          {titleText ? <title>{titleText}</title> : null}
          <circle cx="12" cy="12" r="9" strokeWidth="1.85" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3 12h18" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M12 3a14 14 0 0 1 0 18"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            d="M12 3a14 14 0 0 0 0 18"
          />
        </svg>
      );
    }
    if (name === 'video') {
      return (
        <svg
          className={`${cls} text-fuchsia-300`}
          width={52}
          height={52}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          {titleText ? <title>{titleText}</title> : null}
          <rect x="3" y="6" width="14" height="12" rx="2" strokeWidth="1.85" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.85"
            d="M17 10l4-3v10l-4-3z"
          />
          <circle cx="6" cy="9" r=".6" fill="currentColor" />
          <circle cx="6" cy="12" r=".6" fill="currentColor" />
          <circle cx="6" cy="15" r=".6" fill="currentColor" />
        </svg>
      );
    }
    // infra (servers)
    return (
      <svg
        className={`${cls} text-slate-300`}
        width={52}
        height={52}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        {titleText ? <title>{titleText}</title> : null}
        <rect x="4" y="4" width="16" height="4" rx="1.2" strokeWidth="1.85" />
        <rect x="4" y="10" width="16" height="4" rx="1.2" strokeWidth="1.85" />
        <rect x="4" y="16" width="16" height="4" rx="1.2" strokeWidth="1.85" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          d="M6 6h.01M6 12h.01M6 18h.01"
        />
      </svg>
    );
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 grid grid-cols-3 grid-rows-3 sm:grid-rows-1 sm:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-6 md:gap-12 lg:gap-12">
        {items.map((it, idx) => {
          // Mobile X layout (3x3):
          // 0:(1,1)  1:(1,3)
          // 2:(2,2)
          // 3:(3,1)  4:(3,3)
          const mobileLayout = [
            'row-start-1 col-start-1 sm:row-auto sm:col-auto',
            'row-start-1 col-start-3 sm:row-auto sm:col-auto',
            'row-start-2 col-start-2 sm:row-auto sm:col-auto',
            'row-start-3 col-start-1 sm:row-auto sm:col-auto',
            'row-start-3 col-start-3 sm:row-auto sm:col-auto',
            'row-start-2 col-start-1 sm:row-auto sm:col-auto',
          ];
          const posClass = mobileLayout[idx] || 'sm:row-auto sm:col-auto';
          const hexClip = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
          const href = getToolHref(it.key);
          return (
            <div
              key={it.key}
              className={`relative group justify-self-center w-[84px] sm:w-[112px] md:w-[128px] lg:w-[144px] ${posClass}`}
            >
              {href ? (
                <a
                  href={href}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 rounded-sm"
                  aria-label={`Open ${it.label}`}
                  title={it.label}
                >
                  <div
                    className={`isolate overflow-hidden flex items-center ${iconsOnly ? 'gap-2' : 'gap-2.5'} justify-center px-1.5 py-1.5 sm:px-4 sm:py-3 border border-white/15 bg-white/10 dark:bg-white/5 backdrop-blur-xl landing-holo-panel transition duration-300 will-change-transform hover:-translate-y-0.5 hex-shape w-full`}
                    style={{
                      clipPath: hexClip as any,
                      WebkitClipPath: hexClip as any,
                      aspectRatio: '2 / 1.732',
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 hex-shape landing-holo-bg"
                      aria-hidden="true"
                      style={{ clipPath: hexClip as any, WebkitClipPath: hexClip as any }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 hex-shape"
                      aria-hidden="true"
                      style={{
                        clipPath: hexClip as any,
                        WebkitClipPath: hexClip as any,
                        boxShadow:
                          'inset 0 0 28px rgba(0,0,0,0.34), inset 0 18px 36px rgba(0,0,0,0.18), inset 0 -18px 36px rgba(0,0,0,0.18)',
                      }}
                    />
                    <span className={`h-1.5 w-1.5 rounded-full ${colorClass(it.value)}`} />
                    <ToolIcon name={it.key} titleText={it.label} />
                    {!iconsOnly && (
                      <span
                        className={`text-[12px] font-semibold tracking-wider status-label ${textClass(it.value)}`}
                      >
                        {it.label}
                      </span>
                    )}
                  </div>
                </a>
              ) : (
                <div
                  className={`isolate overflow-hidden flex items-center ${iconsOnly ? 'gap-2' : 'gap-2.5'} justify-center px-1.5 py-1.5 sm:px-4 sm:py-3 border border-white/15 bg-white/10 dark:bg-white/5 backdrop-blur-xl landing-holo-panel transition duration-300 will-change-transform hex-shape w-full`}
                  style={{
                    clipPath: hexClip as any,
                    WebkitClipPath: hexClip as any,
                    aspectRatio: '2 / 1.732',
                  }}
                  aria-label={`${it.label}: ${it.value === true ? 'ok' : it.value === false ? 'down' : 'checking'}`}
                  title={it.label}
                >
                  <span
                    className="pointer-events-none absolute inset-0 hex-shape landing-holo-bg"
                    aria-hidden="true"
                    style={{ clipPath: hexClip as any, WebkitClipPath: hexClip as any }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 hex-shape"
                    aria-hidden="true"
                    style={{
                      clipPath: hexClip as any,
                      WebkitClipPath: hexClip as any,
                      boxShadow:
                        'inset 0 0 28px rgba(0,0,0,0.34), inset 0 18px 36px rgba(0,0,0,0.18), inset 0 -18px 36px rgba(0,0,0,0.18)',
                    }}
                  />
                  <span className={`h-1.5 w-1.5 rounded-full ${colorClass(it.value)}`} />
                  <ToolIcon name={it.key} titleText={it.label} />
                  {!iconsOnly && (
                    <span
                      className={`text-[12px] font-semibold tracking-wider status-label ${textClass(it.value)}`}
                    >
                      {it.label}
                    </span>
                  )}
                </div>
              )}
              <span
                role="tooltip"
                className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 text-white/90 text-[10px] px-2 py-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
              >
                {it.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
