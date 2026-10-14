import React from "react";

interface NenoLogoProps {
  className?: string;
  size?: number;
}

export function NenoLogo({ className = "w-8 h-8", size }: NenoLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      style={style}
      fill="none"
      role="img"
      aria-label="Neno Logo"
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="nlBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0e1322" />
          <stop offset="50%" stopColor="#080c16" />
          <stop offset="100%" stopColor="#020408" />
        </linearGradient>

        {/* Luminous Rim */}
        <linearGradient id="nlRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
          <stop offset="30%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
        </linearGradient>

        {/* Left Pillar */}
        <linearGradient id="nlLeftPillar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Diagonal Bridge */}
        <linearGradient id="nlDiagBridge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="25%" stopColor="#6366f1" />
          <stop offset="60%" stopColor="#a855f7" />
          <stop offset="90%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>

        {/* Right Pillar */}
        <linearGradient id="nlRightPillar" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="85%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fffbeb" />
        </linearGradient>

        {/* Spark Flare */}
        <linearGradient id="nlSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>

        {/* Specular Highlight */}
        <linearGradient id="nlSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* Filters */}
        <filter id="nlAmbientBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="40" result="blur" />
        </filter>
        <filter id="nlShadow3d" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="-6" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.75" />
        </filter>
        <filter id="nlSparkGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#fbbf24" floodOpacity="0.95" />
        </filter>
      </defs>

      {/* Squircle Base Tile */}
      <rect x="0" y="0" width="512" height="512" rx="124" fill="url(#nlBgGrad)" />

      {/* Luminous Rim Border */}
      <rect x="3.5" y="3.5" width="505" height="505" rx="121" fill="none" stroke="url(#nlRimGrad)" strokeWidth="7" />

      {/* Soft Ambient Backdrop Glows */}
      <g opacity="0.5" filter="url(#nlAmbientBlur)">
        <circle cx="150" cy="220" r="110" fill="#0284c7" />
        <circle cx="260" cy="270" r="120" fill="#9333ea" />
        <circle cx="360" cy="200" r="100" fill="#ea580c" />
      </g>

      {/* Monogram Geometry */}
      <g>
        {/* Left Pillar */}
        <rect x="108" y="128" width="72" height="256" rx="36" fill="url(#nlLeftPillar)" />
        <rect x="116" y="136" width="14" height="200" rx="7" fill="url(#nlSpecular)" />

        {/* Center Diagonal Bridge */}
        <line
          x1="144"
          y1="164"
          x2="368"
          y2="348"
          stroke="url(#nlDiagBridge)"
          strokeWidth="72"
          strokeLinecap="round"
          filter="url(#nlShadow3d)"
        />

        {/* Right Pillar */}
        <rect x="332" y="128" width="72" height="256" rx="36" fill="url(#nlRightPillar)" filter="url(#nlShadow3d)" />
        <rect x="374" y="140" width="14" height="190" rx="7" fill="url(#nlSpecular)" />

        {/* Center Core Pulse */}
        <circle cx="256" cy="256" r="8" fill="#ffffff" opacity="0.6" />
      </g>

      {/* Primary AI Generative Diamond Spark (Crown) */}
      <g transform="translate(368, 114)" filter="url(#nlSparkGlow)">
        <path
          d="M 0,-48 C 3.5,-16 16,-3.5 48,0 C 16,3.5 3.5,16 0,48 C -3.5,16 -16,3.5 -48,0 C -16,-3.5 -3.5,-16 0,-48 Z"
          fill="url(#nlSparkGrad)"
        />
        <circle cx="0" cy="0" r="9" fill="#ffffff" />
      </g>

      {/* Secondary Cyan Spark */}
      <g transform="translate(92, 112)" opacity="0.85">
        <path d="M 0,-20 C 1.8,-7 7,-1.8 20,0 C 7,1.8 1.8,7 0,20 C -1.8,7 -7,1.8 -20,0 C -7,-1.8 -1.8,-7 0,-20 Z" fill="#38bdf8" />
        <circle cx="0" cy="0" r="4" fill="#ffffff" />
      </g>

      {/* Tertiary Gold Spark */}
      <g transform="translate(424, 396)" opacity="0.7">
        <path d="M 0,-15 C 1.2,-5 5,-1.2 15,0 C 5,1.2 1.2,5 0,15 C -1.2,5 -5,1.2 -15,0 C -5,-1.2 -1.2,-5 0,-15 Z" fill="#fbbf24" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
      </g>
    </svg>
  );
}
