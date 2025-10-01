/**
 * Enhanced Spam-Detection für Kommentare
 * Implementiert Multi-Layer Spam-Erkennung mit Scoring-System
 */

export interface SpamCheckResult {
  isSpam: boolean;
  confidence: number; // 0.0 - 1.0
  score: number; // Internal spam score (0-100+)
  reasons: string[];
  category?: 'keyword' | 'pattern' | 'link' | 'repetition' | 'length';
}

/**
 * Bekannte Spam-Keywords (erweiterte Liste)
 */
const SPAM_KEYWORDS = [
  // Kommerziell
  'buy now', 'click here', 'limited time', 'act now', 'order now',
  'special offer', 'best price', 'lowest price', 'free shipping',
  'money back', 'guarantee', 'risk free', 'no obligation',

  // Pharma & Health
  'viagra', 'cialis', 'pharmacy', 'prescription', 'weight loss',
  'lose weight', 'diet pills', 'miracle cure', 'anti aging',

  // Casino & Gambling
  'casino', 'poker', 'lottery', 'jackpot', 'betting', 'odds',

  // MLM & Pyramid
  'mlm', 'multi level', 'pyramid', 'home based business',
  'work from home', 'earn money fast', 'get rich', 'passive income',

  // Finance
  'credit card', 'loan approval', 'cash advance', 'debt relief',
  'consolidate debt', 'refinance', 'foreclosure',

  // Adult Content
  'xxx', 'adult content', 'dating site', 'hookup',

  // Generic Spam
  'congratulations', 'youve won', 'claim your prize', 'winner',
  'free trial', 'limited spots', 'exclusive access',

  // SEO Spam
  'seo services', 'backlinks', 'page rank', 'traffic boost',
];

/**
 * Verdächtige URL-Patterns
 */
const SUSPICIOUS_PATTERNS = [
  /https?:\/\/[^\s]{60,}/gi, // Sehr lange URLs (>60 Zeichen)
  /(.)\1{10,}/gi, // 10+ wiederholte Zeichen
  /\b[A-Z]{10,}\b/g, // 10+ aufeinanderfolgende Großbuchstaben
  /\d{10,}/g, // 10+ aufeinanderfolgende Zahlen
  /(click|buy|order|visit)\s+(here|now)/gi, // Call-to-action Phrasen
  /\b(www\.|\w+\.com|\w+\.net|\w+\.org)\b/gi, // Domain-Namen
];

/**
 * Blacklisted Domain-Patterns
 */
const BLACKLISTED_DOMAINS = [
  /bit\.ly/i,
  /goo\.gl/i,
  /tinyurl/i,
  /t\.co/i, // URL-Shortener oft für Spam genutzt
];

/**
 * Hauptfunktion: Prüft Content auf Spam
 *
 * @param content - Zu prüfender Text-Content
 * @param options - Optionale Konfiguration
 * @returns SpamCheckResult mit Bewertung
 */
export function checkSpam(
  content: string,
  options?: {
    strictness?: 'low' | 'medium' | 'high';
    customKeywords?: string[];
  }
): SpamCheckResult {
  const reasons: string[] = [];
  let spamScore = 0;
  const strictness = options?.strictness || 'medium';

  // Schwellenwerte nach Strictness
  const thresholds = {
    low: 70,
    medium: 50,
    high: 30,
  };

  // 1. Keyword-Check
  const keywordCheck = checkKeywords(content, options?.customKeywords);
  if (keywordCheck.found.length > 0) {
    spamScore += keywordCheck.found.length * 15;
    reasons.push(`Spam keywords detected: ${keywordCheck.found.slice(0, 3).join(', ')}`);
  }

  // 2. Pattern-Check (verdächtige Muster)
  const patternCheck = checkPatterns(content);
  if (patternCheck.matches > 0) {
    spamScore += patternCheck.matches * 20;
    reasons.push(...patternCheck.reasons);
  }

  // 3. Link-Density Check
  const linkCheck = checkLinks(content);
  if (linkCheck.count > 3) {
    spamScore += linkCheck.count * 10;
    reasons.push(`Excessive links detected: ${linkCheck.count} links`);
  }
  if (linkCheck.hasBlacklistedDomains) {
    spamScore += 40;
    reasons.push('Blacklisted URL shortener detected');
  }

  // 4. Repetition-Check
  const repetitionCheck = checkRepetition(content);
  if (repetitionCheck.score > 0) {
    spamScore += repetitionCheck.score;
    reasons.push(...repetitionCheck.reasons);
  }

  // 5. Length-Check (zu kurz oder zu lang kann verdächtig sein)
  const lengthCheck = checkLength(content);
  if (lengthCheck.suspicious) {
    spamScore += lengthCheck.score;
    reasons.push(lengthCheck.reason);
  }

  // 6. Caps-Lock Check (zu viele Großbuchstaben)
  const capsCheck = checkCapsLock(content);
  if (capsCheck.percentage > 0.5) {
    spamScore += 25;
    reasons.push(`Excessive caps lock: ${Math.round(capsCheck.percentage * 100)}%`);
  }

  // Finales Ergebnis
  const threshold = thresholds[strictness];
  const isSpam = spamScore >= threshold;
  const confidence = Math.min(spamScore / 100, 1);

  return {
    isSpam,
    confidence,
    score: spamScore,
    reasons,
    category: determinePrimaryCategory(reasons),
  };
}

/**
 * Prüft auf Spam-Keywords
 */
function checkKeywords(
  content: string,
  customKeywords?: string[]
): { found: string[] } {
  const lowerContent = content.toLowerCase();
  const allKeywords = [...SPAM_KEYWORDS, ...(customKeywords || [])];

  const found = allKeywords.filter(keyword =>
    lowerContent.includes(keyword.toLowerCase())
  );

  return { found };
}

/**
 * Prüft auf verdächtige Patterns
 */
function checkPatterns(content: string): { matches: number; reasons: string[] } {
  let matches = 0;
  const reasons: string[] = [];

  for (const pattern of SUSPICIOUS_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matches++;
      if (pattern.source.includes('https?')) {
        reasons.push('Suspicious long URL detected');
      } else if (pattern.source.includes('\\1')) {
        reasons.push('Excessive character repetition');
      } else if (pattern.source.includes('[A-Z]')) {
        reasons.push('Excessive uppercase letters');
      }
    }
  }

  return { matches, reasons };
}

/**
 * Prüft Link-Density und Blacklist
 */
function checkLinks(content: string): {
  count: number;
  hasBlacklistedDomains: boolean;
  domains: string[];
} {
  const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
  const count = urlMatches.length;

  const domains = urlMatches.map(url => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }).filter(Boolean);

  const hasBlacklistedDomains = domains.some(domain =>
    BLACKLISTED_DOMAINS.some(pattern => pattern.test(domain))
  );

  return { count, hasBlacklistedDomains, domains };
}

/**
 * Prüft auf Wiederholungen (Wörter, Sätze)
 */
function checkRepetition(content: string): { score: number; reasons: string[] } {
  const words = content.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  const reasons: string[] = [];
  let score = 0;

  // Zähle Wortwiederholungen
  for (const word of words) {
    if (word.length > 3) { // Nur Wörter > 3 Zeichen
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Prüfe auf excessive Wiederholungen
  for (const [word, count] of wordCounts.entries()) {
    if (count > 5) {
      score += 15;
      reasons.push(`Word "${word}" repeated ${count} times`);
    }
  }

  return { score, reasons };
}

/**
 * Prüft Content-Länge
 */
function checkLength(content: string): {
  suspicious: boolean;
  score: number;
  reason: string;
} {
  const length = content.trim().length;

  // Sehr kurzer Content mit Links ist verdächtig
  if (length < 20 && content.includes('http')) {
    return {
      suspicious: true,
      score: 20,
      reason: 'Very short content with links',
    };
  }

  // Sehr langer Content (>5000) kann Spam sein
  if (length > 5000) {
    return {
      suspicious: true,
      score: 15,
      reason: 'Excessively long content',
    };
  }

  return { suspicious: false, score: 0, reason: '' };
}

/**
 * Prüft Caps-Lock Anteil
 */
function checkCapsLock(content: string): { percentage: number } {
  const letters = content.match(/[a-zA-Z]/g) || [];
  const upperLetters = content.match(/[A-Z]/g) || [];

  const percentage = letters.length > 0
    ? upperLetters.length / letters.length
    : 0;

  return { percentage };
}

/**
 * Bestimmt die primäre Spam-Kategorie
 */
function determinePrimaryCategory(
  reasons: string[]
): SpamCheckResult['category'] {
  const reasonText = reasons.join(' ').toLowerCase();

  if (reasonText.includes('keyword')) return 'keyword';
  if (reasonText.includes('link') || reasonText.includes('url')) return 'link';
  if (reasonText.includes('pattern') || reasonText.includes('caps')) return 'pattern';
  if (reasonText.includes('repetition') || reasonText.includes('repeated')) return 'repetition';
  if (reasonText.includes('length')) return 'length';

  return 'keyword'; // Default
}

/**
 * Hilfsfunktion: Gibt Spam-Statistiken für Content zurück
 */
export function getSpamStats(content: string): {
  length: number;
  linkCount: number;
  keywordCount: number;
  capsPercentage: number;
} {
  const linkCheck = checkLinks(content);
  const keywordCheck = checkKeywords(content);
  const capsCheck = checkCapsLock(content);

  return {
    length: content.length,
    linkCount: linkCheck.count,
    keywordCount: keywordCheck.found.length,
    capsPercentage: Math.round(capsCheck.percentage * 100),
  };
}
