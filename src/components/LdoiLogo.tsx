import React from 'react';

interface LdoiLogoProps {
  size?: number;
}

/**
 * 4-Core Silicon IC Package / QFN Microcontroller using the 4 founders'
 * signature die colors on a PCB substrate with gold ENIG pins:
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
      aria-label="Project LDOI IC Logo"
    >
      {/* PCB Substrate */}
      <rect width="64" height="64" rx="14" fill="#0B231B" />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="13"
        stroke="#D4AF37"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />

      {/* Gold ENIG Package Pins (Top, Bottom, Left, Right) */}
      {[20, 28, 36, 44].map((pos) => (
        <React.Fragment key={pos}>
          <rect x={pos - 1.5} y="4" width="3" height="6" rx="1" fill="#E5C158" />
          <rect x={pos - 1.5} y="54" width="3" height="6" rx="1" fill="#E5C158" />
          <rect x="4" y={pos - 1.5} width="6" height="3" rx="1" fill="#E5C158" />
          <rect x="54" y={pos - 1.5} width="6" height="3" rx="1" fill="#E5C158" />
        </React.Fragment>
      ))}

      {/* IC Epoxy Body */}
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="8"
        fill="#15191E"
        stroke="#2B343E"
        strokeWidth="1.5"
      />

      {/* Pin-1 Fiducial Dot */}
      <circle cx="15" cy="15" r="1.5" fill="#E5C158" />

      {/* 4 Founder Silicon Dies */}
      {/* Hasan: Deep Crimson Maroon */}
      <rect x="14" y="18" width="16" height="17" rx="3" fill="#660909" stroke="#E5C158" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* Aathavan: Muted Steel Slate */}
      <rect x="34" y="14" width="16" height="13" rx="3" fill="#254454" stroke="#E5C158" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* Allen: Deep Midnight Pine */}
      <rect x="14" y="38" width="16" height="12" rx="3" fill="#0D292F" stroke="#E5C158" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* Harshath: Deep Ocean Cobalt */}
      <rect x="34" y="31" width="16" height="19" rx="3" fill="#0A5386" stroke="#E5C158" strokeOpacity="0.35" strokeWidth="0.75" />
    </svg>
  );
};
