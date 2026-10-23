import React from 'react';

export default function BrandMark({ large = false }: { large?: boolean }) {
  return <div className={`brand-mark ${large ? 'large' : ''}`} aria-label="Physique 57">
    <svg viewBox="0 0 52 52" role="img" aria-hidden="true">
      <rect x="1" y="1" width="50" height="50" rx="15" fill="currentColor" opacity=".08"/>
      <text x="26" y="36" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="900" letterSpacing="-1.8">P57</text>
      <path d="M8 13h9l3 3 6-9 6 9 4-3h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".72"/>
    </svg>
  </div>;
}
