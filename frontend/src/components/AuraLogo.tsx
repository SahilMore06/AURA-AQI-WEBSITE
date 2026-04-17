import React from 'react';

interface AuraLogoProps {
  width?: number;
  height?: number;
  variant?: 'full' | 'icon';
  className?: string;
}

/**
 * High-fidelity SVG recreation of the AURA brand identity.
 * Features the institutional radar-ring icon and "AURA" wordmark
 * with the signature teal accent on the leading character.
 *
 * Usage:
 *   <AuraLogo />                    — default 220×50
 *   <AuraLogo variant="icon" />     — radar icon only (40×40)
 */
export function AuraLogo({ width = 220, height = 50, variant = 'full', className }: AuraLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={width > 50 ? 40 : width}
        height={height > 50 ? 40 : height}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Outer radar rings */}
        <circle cx="20" cy="20" r="18" fill="none" stroke="#00D4AA" strokeWidth="0.5" opacity="0.3" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#00D4AA" strokeWidth="1" opacity="0.5" />
        <circle cx="20" cy="20" r="10" fill="none" stroke="#00D4AA" strokeWidth="1.5" opacity="0.8" />
        {/* Core */}
        <circle cx="20" cy="20" r="4" fill="#00D4AA" />
        {/* Satellite nodes */}
        <circle cx="35" cy="10" r="2.5" fill="#00D4AA" />
        <circle cx="5" cy="30" r="2.5" fill="#60A5FA" />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 50"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Radar icon group */}
      <g transform="translate(5, 5)">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#00D4AA" strokeWidth="0.5" opacity="0.3" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#00D4AA" strokeWidth="1" opacity="0.5" />
        <circle cx="20" cy="20" r="10" fill="none" stroke="#00D4AA" strokeWidth="1.5" opacity="0.8" />
        <circle cx="20" cy="20" r="4" fill="#00D4AA" />
        <circle cx="35" cy="10" r="2.5" fill="#00D4AA" />
        <circle cx="5" cy="30" r="2.5" fill="#60A5FA" />
      </g>

      {/* Wordmark */}
      <text x="55" y="32" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28" fill="currentColor">
        <tspan fill="#00D4AA">A</tspan>URA
      </text>

      {/* Tagline */}
      <text x="55" y="44" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" fill="currentColor" opacity="0.5" letterSpacing="0.8">
        AIR QUALITY REALTIME ANALYTICS
      </text>
    </svg>
  );
}

/**
 * Returns raw SVG markup string for embedding inside report HTML templates.
 * Used by Map.tsx and ieeeDashboardReport.ts report generators.
 */
export function getAuraLogoSvgString(w = 220, h = 50, textColor = '#111', accentColor = '#00D4AA'): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg"><g transform="translate(5, 5)"><circle cx="20" cy="20" r="18" fill="none" stroke="${accentColor}" stroke-width="0.5" opacity="0.3"/><circle cx="20" cy="20" r="14" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.8"/><circle cx="20" cy="20" r="4" fill="${accentColor}"/><circle cx="35" cy="10" r="2.5" fill="${accentColor}"/><circle cx="5" cy="30" r="2.5" fill="#60A5FA"/></g><text x="55" y="32" font-family="Arial Black, sans-serif" font-weight="900" font-size="28" fill="${textColor}"><tspan fill="${accentColor}">A</tspan>URA</text><text x="55" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="${textColor}" opacity="0.5" letter-spacing="0.8">AIR QUALITY REALTIME ANALYTICS</text></svg>`;
}
