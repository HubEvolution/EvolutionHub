const DEFAULT_MAX_AUTO_ASSERTIONS = 3;
const MIN_DESCRIPTION_LENGTH = 10;

const DE_STOPWORDS = new Set([
  'und',
  'oder',
  'aber',
  'dass',
  'eine',
  'einer',
  'einem',
  'dieser',
  'diese',
  'dieses',
  'für',
  'mit',
  'ohne',
  'wenn',
  'dann',
]);

const EN_STOPWORDS = new Set([
  'and',
  'or',
  'but',
  'that',
  'this',
  'these',
  'those',
  'with',
  'without',
  'when',
  'then',
  'from',
  'into',
  'your',
]);

export interface AutoAssertionInput {
  id?: string;
  kind: 'textIncludes';
  value: string;
  description?: string;
}

export interface GenerateAutoAssertionsParams {
  url: string;
  description: string;
  maxAssertions?: number;
}

function extractQuotedPhrases(description: string): string[] {
  const phrases: string[] = [];

  const patterns = [
    /"([^"]{1,80})"/g, // double quotes
    /'([^']{1,80})'/g, // single quotes
    /`([^`]{1,80})`/g, // backticks
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(description)) !== null) {
      const value = match[1].trim();
      if (value.length >= 3) {
        phrases.push(value);
      }
    }
  }

  return phrases;
}

function extractKeywordTokens(description: string): string[] {
  const normalized = description.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized) return [];

  const rawTokens = normalized.split(/[^a-z0-9äöüß]+/g);
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of rawTokens) {
    if (!token || token.length < 4) continue;
    if (DE_STOPWORDS.has(token) || EN_STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

export function generateAutoAssertions(params: GenerateAutoAssertionsParams): AutoAssertionInput[] {
  const { description, maxAssertions } = params;
  const trimmed = description.trim();

  const numericMax = typeof maxAssertions === 'number' ? maxAssertions : undefined;
  const limit =
    typeof numericMax === 'number' && Number.isFinite(numericMax) && numericMax > 0
      ? Math.floor(numericMax)
      : DEFAULT_MAX_AUTO_ASSERTIONS;

  if (!trimmed || trimmed.length < MIN_DESCRIPTION_LENGTH || limit <= 0) {
    return [];
  }

  const results: AutoAssertionInput[] = [];

  const quoted = extractQuotedPhrases(trimmed);
  for (const phrase of quoted) {
    if (results.length >= limit) break;
    results.push({ kind: 'textIncludes', value: phrase });
  }

  if (results.length >= limit) {
    return results;
  }

  const lowerPhrases = new Set(quoted.map((p) => p.toLowerCase()));
  const tokens = extractKeywordTokens(trimmed);

  for (const token of tokens) {
    if (results.length >= limit) break;

    let overlapsPhrase = false;
    for (const phrase of lowerPhrases) {
      if (phrase.includes(token)) {
        overlapsPhrase = true;
        break;
      }
    }

    if (overlapsPhrase) continue;

    results.push({ kind: 'textIncludes', value: token });
  }

  return results;
}
