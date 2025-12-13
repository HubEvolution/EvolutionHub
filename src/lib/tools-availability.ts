import type { Tool } from '@/lib/tools-data';

function flagOn(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null) return true;
  const v = String(raw).toLowerCase().trim();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

export function isToolVisible(toolId: Tool['id']): boolean {
  const env = import.meta.env as Record<string, string | undefined>;

  switch (toolId) {
    case 'prompt-enhancer': {
      // Prompt Enhancer wird über PUBLIC_PROMPT_ENHANCER_V1 global ein-/ausgeschaltet.
      return flagOn(env.PUBLIC_PROMPT_ENHANCER_V1);
    }
    case 'Imag-Enhancer': {
      // Image Enhancer richtet sich nach den bestehenden PUBLIC_ENHANCER_* Flags.
      const mvpOn = flagOn(env.PUBLIC_ENHANCER_MVP_MODE);
      const legacyOn = flagOn(env.PUBLIC_ENHANCER_LEGACY_MODE);
      return mvpOn || legacyOn;
    }
    case 'video-enhancer': {
      // Video Enhancer wird über ENABLE_VIDEO_ENHANCER je Env explizit gesteuert.
      return flagOn(env.ENABLE_VIDEO_ENHANCER);
    }
    case 'voice-visualizer': {
      // Voice Visualizer kann über PUBLIC_TOOL_VOICE_VISUALIZER ein-/ausgeschaltet werden.
      return flagOn(env.PUBLIC_TOOL_VOICE_VISUALIZER);
    }
    case 'webscraper': {
      // Webscraper-Tool kann über PUBLIC_TOOL_WEBSCRAPER ein-/ausgeschaltet werden.
      return flagOn(env.PUBLIC_TOOL_WEBSCRAPER) && flagOn(env.PUBLIC_WEBSCRAPER_V1);
    }
    case 'web-eval': {
      // Web-Eval-Tool kann über PUBLIC_TOOL_WEB_EVAL ein-/ausgeschaltet werden.
      return flagOn(env.PUBLIC_TOOL_WEB_EVAL);
    }
    default:
      // Andere Tools bleiben ohne zusätzliches Flag sichtbar.
      return true;
  }
}
