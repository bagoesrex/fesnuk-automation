interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = '', size = 28 }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="8" fill="#09090b" />
      <rect
        width="32"
        height="32"
        rx="8"
        stroke="#27272a"
        strokeWidth="1"
      />
      {/* Dynamic Hex Node */}
      <path
        d="M16 6.5L24.5 11.2V20.8L16 25.5L7.5 20.8V11.2L16 6.5Z"
        stroke="#3b82f6"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Signal Emitter Lines */}
      <path
        d="M16 11V14M16 18V21M11.5 13.5L13.8 14.8M18.2 17.2L20.5 18.5M20.5 13.5L18.2 14.8M13.8 17.2L11.5 18.5"
        stroke="#60a5fa"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Central Core */}
      <circle cx="16" cy="16" r="2.75" fill="#2563eb" />
      <circle cx="16" cy="16" r="1.2" fill="#ffffff" />
      {/* Live sync satellite dot */}
      <circle cx="24.5" cy="11.2" r="1.6" fill="#10b981" />
    </svg>
  );
}
