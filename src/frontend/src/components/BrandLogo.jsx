import React from 'react';

/**
 * Logotipo oficial e insignia vectorial de SaludConecta IPS v2.4.
 * Combina la cruz médica institucional con el pulso fisiológico ECG
 * y el gradiente clínico de alta visibilidad (WCAG AAA).
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
      className={`relative shrink-0 rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105 ${selectedSize} ${className}`}
      title="SaludConecta IPS - Red Hospitalaria del Norte del Valle"
    >
      <svg
        viewBox="0 0 48 48"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo SaludConecta IPS"
      >
        <defs>
          <linearGradient id="scBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#006A60" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Fondo con gradiente y borde protector */}
        <rect width="48" height="48" rx="12" fill="url(#scBrandGrad)" />
        <rect
          width="48"
          height="48"
          rx="12"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />

        {/* Cruz médica institucional en blanco puro */}
        <path
          d="M20 9.5C20 7.5 21.5 6 24 6C26.5 6 28 7.5 28 9.5V19.5H38.5C40.5 19.5 42 21 42 23.5C42 26 40.5 27.5 38.5 27.5H28V38.5C28 40.5 26.5 42 24 42C21.5 42 20 40.5 20 38.5V27.5H9.5C7.5 27.5 6 26 6 23.5C6 21 7.5 19.5 9.5 19.5H20V9.5Z"
          fill="#FFFFFF"
        />

        {/* Trazo de pulso fisiológico / ECG hospitalario */}
        <path
          d="M11 23.5H18L21 16.5L26 31L29 23.5H37"
          stroke="#006A60"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default BrandLogo;

