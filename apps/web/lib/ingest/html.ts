/** Email HTML → (image URL list, clean text). Pure functions; no I/O. Token discipline lives here. */

const SKIP_IMG = /(pixel|track|spacer|beacon|logo|icon|badge|social|facebook|instagram|twitter|tiktok|pinterest|youtube|arrow|divider|bullet|\.gif(\?|$)|1x1|blank\.)/i;

/** Product-looking images, in document order, deduped, capped. Tracking pixels and chrome are dropped. */
export function extractImageUrls(html: string, cap = 12): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src = /\ssrc=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || !/^https?:\/\//i.test(src) || SKIP_IMG.test(src)) continue;
    const w = Number(/\swidth=["']?(\d+)/i.exec(tag)?.[1] ?? NaN);
    const h = Number(/\sheight=["']?(\d+)/i.exec(tag)?.[1] ?? NaN);
    if ((Number.isFinite(w) && w < 80) || (Number.isFinite(h) && h < 80)) continue;
    const clean = src.replace(/&amp;/g, '&');
    if (seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
    if (urls.length >= cap) break;
  }
  return urls;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', mdash: '—', ndash: '–', copy: '©', reg: '®', trade: '™' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? all;
  });
}

export function htmlToText(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article|header|footer)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' \t ')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

const BOILERPLATE = /(unsubscribe|privacy policy|terms (of|&) (service|use)|view (this|in) (email|browser)|all rights reserved|©|copyright|manage (your )?preferences|you (are|were) receiving|customer service|contact us|follow us|download (the|our) app|app store|google play|this email was sent|update your (email )?preferences|do not reply|no-reply|help center|faq|gift cards?$|shop now|sign in to|your account)/i;

/** Drop boilerplate lines, then truncate. ~6k chars keeps a typical order email under ~1.8k tokens. */
export function cleanEmailText(text: string, maxChars = 6000): string {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && l.length < 400 && !BOILERPLATE.test(l));
  const dedup: string[] = [];
  let prev = '';
  for (const l of lines) { if (l !== prev) dedup.push(l); prev = l; }
  const out = dedup.join('\n');
  return out.length > maxChars ? out.slice(0, maxChars) + '\n[truncated]' : out;
}

/** Convenience: full email → {images, text}. Prefers HTML (has images); falls back to plain text. */
export function prepareEmail(input: { html: string | null; text: string | null }): { imageUrls: string[]; text: string } {
  if (input.html) return { imageUrls: extractImageUrls(input.html), text: cleanEmailText(htmlToText(input.html)) };
  return { imageUrls: [], text: cleanEmailText(input.text ?? '') };
}
