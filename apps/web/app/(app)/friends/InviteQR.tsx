'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function InviteQR({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { QRCode.toString(url, { type: 'svg', margin: 1, width: 160, color: { dark: '#000000', light: '#ffffff' } }).then(setSvg).catch(() => setSvg('')); }, [url]);
  if (!svg) return null;
  return <div className="inline-block bg-white p-1 [&>svg]:h-40 [&>svg]:w-40" dangerouslySetInnerHTML={{ __html: svg }} />;
}
