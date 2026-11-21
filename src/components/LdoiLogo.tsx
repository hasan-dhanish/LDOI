import React from 'react';

interface LdoiLogoProps {
  size?: number;
}

/**
 * Four interlocking geometric blocks using the 4 founders' signature card colors
 * on a crisp light paper squircle:
 * Hasan (#660909 Crimson), Harshath (#0A5386 Cobalt),
 * Aathavan (#254454 Steel), Allen (#0D292F Deep Pine).
 */
export const LdoiLogo: React.FC<LdoiLogoProps> = ({ size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs"
      aria-label="Project LDOI Logo"
    >
      <rect width="64" height="64" rx="16" fill="#FCF9F3" />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
        stroke="#8C806E"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      {/* Hasan: Deep Crimson Maroon */}
      <rect x="12" y="12" width="18" height="24" rx="4.5" fill="#660909" />
      {/* Aathavan: Muted Steel Slate */}
      <rect x="34" y="12" width="18" height="15" rx="4.5" fill="#254454" />
      {/* Allen: Deep Midnight Pine */}
      <rect x="12" y="40" width="18" height="12" rx="4.5" fill="#0D292F" />
      {/* Harshath: Deep Ocean Cobalt */}
      <rect x="34" y="31" width="18" height="21" rx="4.5" fill="#0A5386" />
    </svg>
  );
};
