import React from 'react';

/**
 * Logotipo oficial e insignia vectorial de SaludConecta IPS v2.4.
 * Replica con fidelidad 100% el isotipo institucional de cruz médica asistencial
 * con esquinas redondeadas y gradiente clínico.
 */
export const BrandLogo = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative shrink-0 rounded-2xl overflow-hidden shadow-sm transition-transform hover:scale-105 ${selectedSize} ${className}`}
      title="SaludConecta IPS - Red Hospitalaria del Norte del Valle"
    >
      <img
        src="/saludconecta-cross-icon.png"
        alt="Logo SaludConecta IPS"
        className="w-full h-full object-contain rounded-2xl"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      <svg
        style={{ display: 'none' }}
        className="w-full h-full"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo SaludConecta IPS"
      >
        <defs>
          <linearGradient id="scFallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#007F73" />
            <stop offset="100%" stopColor="#004F46" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#scFallbackGrad)" />
        <circle cx="24" cy="24" r="7.5" fill="rgba(255,255,255,0.22)" />
        <rect x="21.5" y="11" width="5" height="26" rx="2.5" fill="#FFFFFF" />
        <rect x="11" y="21.5" width="26" height="5" rx="2.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export default BrandLogo;
