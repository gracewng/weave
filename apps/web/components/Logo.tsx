/* Wordmark from /public/logo.png (1511×489). `size` is the rendered height. */
export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return <img src="/logo.png" alt="weave" width={Math.round(size * 1511 / 489)} height={size} className={`inline-block ${className}`} style={{ height: size, width: 'auto' }} />;
}
