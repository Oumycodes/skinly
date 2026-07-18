/** Strip retail size suffixes like "5.5 oz", "100 ml", "(16 fl oz)". */
export function stripProductSize(name: string): string {
  const cleaned = name
    .replace(/[\s,;\-–—/]*\(?\d+(?:\.\d+)?\s*(?:fl\.?\s*)?oz\.?e?s?\.?\)?/gi, ' ')
    .replace(/[\s,;\-–—/]*\(?\d+(?:\.\d+)?\s*(?:ml|g|kg|l)\.?\)?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–,;/|]+|[\s\-–,;/|]+$/g, '');
  return cleaned || name;
}

const SKIN_TYPE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bmature\s+skin\b/i, label: 'Mature skin' },
  { re: /\bdry\s+skin\b/i, label: 'Dry skin' },
  { re: /\boily\s+skin\b/i, label: 'Oily skin' },
  { re: /\bsensitive\s+skin\b/i, label: 'Sensitive skin' },
  { re: /\bcombination\s+skin\b/i, label: 'Combination skin' },
  { re: /\bacne[-\s]?prone\b/i, label: 'Acne-prone' },
  { re: /\bnormal\s+skin\b/i, label: 'Normal skin' },
  { re: /\ball\s+skin\s+types?\b/i, label: 'All skin types' },
];

const MARKETING_FLUFF =
  /\b(for\s+face|face|paraben[-\s]?free|sulfate[-\s]?free|fragrance[-\s]?free|dermatologist(?:\s+tested)?|non[-\s]?comedogenic|cruelty[-\s]?free|oil[-\s]?free|alcohol[-\s]?free|with\s+[\w\s]+|helps?\s+to\b[^,.]*)\b/gi;

function extractSkinType(text: string): string | null {
  for (const { re, label } of SKIN_TYPE_PATTERNS) {
    if (re.test(text)) return label;
  }
  return null;
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced).trim();
}

/**
 * Keep product title + skin type; drop marketing copy and size noise.
 * e.g. "CeraVe Skin Renewing Vitamin C Serum : For Face, Mature Skin Types, Paraben-Free..."
 *   → "Skin Renewing Vitamin C Serum · Mature skin"
 */
export function shortenProductName(name: string, brand?: string | null): string {
  let text = stripProductSize(name);

  if (brand) {
    const brandRe = new RegExp(
      `^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]?\\s*`,
      'i',
    );
    text = text.replace(brandRe, '');
  }

  const colonParts = text.split(/\s*[:|]\s*/);
  let title = (colonParts[0] ?? text).trim();
  const suffix = colonParts.slice(1).join(' ');

  // Drop trailing " - Travel Size" / pack marketing after em dash when long
  title = title.replace(/\s+[-–—]\s+(travel\s+size|value\s+size|refill|duo|set)\b.*$/i, '');

  const skinType = extractSkinType(`${suffix} ${text}`);

  title = title
    .replace(MARKETING_FLUFF, ' ')
    .replace(/\s*[,;]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–,;/|]+|[\s\-–,;/|]+$/g, '')
    .trim();

  title = truncateAtWord(title, 42);

  if (skinType && !title.toLowerCase().includes(skinType.toLowerCase())) {
    return `${title} · ${skinType}`;
  }
  return title || stripProductSize(name);
}
