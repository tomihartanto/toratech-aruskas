// Logo ArusKas — SVG inline, sama dengan app icon (Rp + lengkung arus kas)
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <text
        x="32"
        y="42"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="30"
        fontWeight="700"
        className="fill-primary-foreground"
        textAnchor="middle"
      >
        Rp
      </text>
      <path d="M14 50 Q32 58 50 50" stroke="#059669" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <span className="flex items-center gap-2 text-lg font-bold">
      <LogoMark className={className} />
      ArusKas
    </span>
  );
}
