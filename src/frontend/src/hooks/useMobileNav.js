import { useEffect, useState } from 'react';

// Ancho minimo (px) desde el cual el menu lateral queda fijo en pantalla (breakpoint `md` de Tailwind)
export const DESKTOP_NAV_MIN_WIDTH = 768;

// Estado del menu lateral deslizable en celulares: se cierra con Escape y al pasar a pantalla ancha
export const useMobileNav = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobileNavOpen || typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_NAV_MIN_WIDTH) setIsMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [isMobileNavOpen]);

  return [isMobileNavOpen, setIsMobileNavOpen];
};

export default useMobileNav;
