export function extractExcerpt(input: string, maxLength: number = 150): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}
