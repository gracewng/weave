import QRCode from 'qrcode';

/** Server-rendered QR (no client dependency on the qrcode browser build). Always black on white so it scans in any theme. */
export async function InviteQR({ url }: { url: string }) {
  let svg = '';
  try { svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 160, color: { dark: '#000000', light: '#ffffff' } }); } catch { svg = ''; }
  if (!svg) return null;
  return <div className="inline-block bg-white p-1 [&>svg]:h-40 [&>svg]:w-40" dangerouslySetInnerHTML={{ __html: svg }} />;
}
