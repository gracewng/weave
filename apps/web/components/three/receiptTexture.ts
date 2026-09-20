/* Paints a receipt onto a canvas: black ink, slight jitter, thermal banding, torn top edge. */
export type Block =
  | { t: 'logo' }
  | { t: 'title'; text: string }
  | { t: 'sub'; text: string }
  | { t: 'text'; text: string }
  | { t: 'rule' }
  | { t: 'line'; label: string; value: string; muted?: boolean }
  | { t: 'space'; h: number };

const SCALE = 1.25; // texture resolution multiplier; layout below is in 1024-wide design px
const W = 1024;
export const PAPER_PX = W * SCALE;
const COL = 680; // centred content column
const PAD = (W - COL) / 2;
const EXTRA = 1.5; // paper length relative to content
const INK = '#111';
const FONTS = { title: '600 46px Unbounded', sub: '500 24px "IBM Plex Mono"', text: '400 32px Fraunces', line: '500 27px "IBM Plex Mono"', logo: '600 54px Unbounded' };

let logoInk: HTMLCanvasElement | null = null;

/* Loads fonts and the logo, recoloured to ink for thermal printing. */
export async function loadReceiptFonts() {
  if (typeof document === 'undefined') return;
  const logo = new Promise<void>((res) => {
    if (logoInk) return res();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d')!; x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = INK; x.fillRect(0, 0, c.width, c.height);
      logoInk = c; res();
    };
    img.onerror = () => res();
    img.src = '/logo.png';
  });
  await Promise.allSettled([logo, ...(document.fonts ? Object.values(FONTS).map((f) => document.fonts.load(f)) : [])]);
}

function rng(seed: number) {
  let s = seed || 1;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - 0.5; };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []; let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

/* One pass lays out and optionally paints; returns content height. */
function pass(ctx: CanvasRenderingContext2D, blocks: Block[], paint: boolean, j: () => number, top = 0) {
  let y = top;
  const ink = (text: string, x: number, yy: number, align: CanvasTextAlign = 'left', alpha = 1) => {
    if (!paint) return;
    ctx.save(); ctx.textAlign = align; ctx.fillStyle = INK; ctx.globalAlpha = alpha;
    ctx.translate(x + j() * 2.2, yy + j() * 1.6); ctx.rotate(j() * 0.01);
    ctx.globalAlpha = alpha * 0.45; ctx.fillText(text, 0.7, 0.4);
    ctx.globalAlpha = alpha; ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  for (const b of blocks) {
    if (b.t === 'logo') {
      const h = 120, w = logoInk ? Math.round(h * logoInk.width / logoInk.height) : 371;
      if (paint && logoInk) { ctx.save(); ctx.translate(j() * 2, j() * 2); ctx.rotate(j() * 0.006); ctx.drawImage(logoInk, (W - w) / 2, y, w, h); ctx.restore(); }
      y += h + 30;
    } else if (b.t === 'title') {
      ctx.font = FONTS.title; ctx.textBaseline = 'alphabetic';
      for (const l of wrap(ctx, b.text, W - PAD * 2)) { y += 46; ink(l, W / 2, y, 'center'); y += 12; }
      y += 10;
    } else if (b.t === 'sub') {
      ctx.font = FONTS.sub; ctx.textBaseline = 'alphabetic'; y += 24; ink(b.text, W / 2, y, 'center', 0.6); y += 14;
    } else if (b.t === 'text') {
      ctx.font = FONTS.text; ctx.textBaseline = 'alphabetic';
      for (const l of wrap(ctx, b.text, W - PAD * 2)) { y += 34; ink(l, W / 2, y, 'center', 0.85); y += 8; }
      y += 8;
    } else if (b.t === 'rule') {
      y += 26;
      if (paint) { ctx.save(); ctx.strokeStyle = INK; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(PAD, y + j()); ctx.lineTo(W - PAD, y + j()); ctx.stroke(); ctx.restore(); }
      y += 22;
    } else if (b.t === 'line') {
      ctx.font = FONTS.line; ctx.textBaseline = 'alphabetic'; y += 30;
      const a = b.muted ? 0.55 : 1;
      const lw = ctx.measureText(b.label).width, vw = ctx.measureText(b.value).width, dw = ctx.measureText('.').width;
      const n = Math.max(0, Math.floor((W - PAD * 2 - lw - vw - 24) / dw));
      ink(b.label, PAD, y, 'left', a);
      if (n > 0) ink('.'.repeat(n), PAD + lw + 12, y, 'left', a * 0.45);
      ink(b.value, W - PAD, y, 'right', a);
      y += 16;
    } else if (b.t === 'space') y += b.h;
  }
  return y - top;
}

function seam(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = INK; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1;
  for (let x = 8; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* One continuous roll, newest section at the top (nearest the slit), oldest at the torn leading edge.
   Each section is padded to EXTRA and separated by a perforated seam.
   overlayPx is the centre of the newest section's trailing space block. */
export function drawReceipt(sections: Block[][], seed = 1): { canvas: HTMLCanvasElement; height: number; overlayPx: number } {
  const probe = document.createElement('canvas'); probe.width = W; probe.height = 8;
  const pctx = probe.getContext('2d')!;
  const order = [...sections].reverse();
  const spans = order.map((b) => { const c = Math.ceil(pass(pctx, b, false, () => 0)); return { c, h: Math.ceil(c * EXTRA) }; });
  const H = spans.reduce((a, s) => a + s.h, 0);
  const canvas = document.createElement('canvas'); canvas.width = PAPER_PX; canvas.height = Math.ceil(H * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE); // paint in design px at higher resolution
  const j = rng(seed * 7919);
  // Paper with a torn bottom edge (transparent notches).
  ctx.fillStyle = '#fbfbf8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H - 14);
  for (let x = W; x >= 0; x -= 22) ctx.lineTo(x, (x / 22) % 2 ? H : H - 14);
  ctx.closePath(); ctx.fill();
  let y = 0, overlayPx = 0;
  order.forEach((blocks, i) => {
    const { c, h } = spans[i]!;
    const top = y + Math.floor((h - c) / 2);
    pass(ctx, blocks, true, j, top);
    if (i === 0) { const tail = blocks[blocks.length - 1]; overlayPx = (top + c - (tail?.t === 'space' ? tail.h / 2 : 0)) * SCALE; }
    y += h;
    if (i < order.length - 1) seam(ctx, y);
  });
  // Thermal banding + speckle.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 18 * sections.length; i++) { ctx.fillStyle = `rgba(255,255,255,${0.18 + Math.abs(j()) * 0.35})`; ctx.fillRect(0, Math.abs(j()) * 2 * H, W, 1 + Math.abs(j()) * 3); }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.07)';
  for (let i = 0; i < 260 * sections.length; i++) ctx.fillRect(Math.abs(j()) * 2 * W, Math.abs(j()) * 2 * H, 2, 2);
  const height = canvas.height;
  return { canvas, height, overlayPx };
}
