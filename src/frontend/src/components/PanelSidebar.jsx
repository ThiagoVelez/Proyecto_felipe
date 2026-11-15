import React from 'react';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';

// Menu lateral de los paneles de gobierno (Administrador y Encargado de TI): colapsable en computador
// y panel deslizable en celular (isMobileOpen / onMobileClose).
export const PanelSidebar = ({
  items,
  currentView,
  setCurrentView,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
  eyebrow,
  title,
  menuName = 'menú lateral',
  footer,
}) => {
  // En celular el menu se muestra completo (sin colapsar) como panel deslizable
  const collapsedView = isCollapsed && !isMobileOpen;
  const handleToggle = isMobileOpen && onMobileClose ? onMobileClose : onToggleCollapse;
  const handleSelect = (id) => {
    setCurrentView(id);
    if (onMobileClose) onMobileClose();
  };
  const menuItems = items;

  return (
    <>
    {isMobileOpen && (
      <div
        className="fixed inset-0 top-16 z-30 bg-black/40 md:hidden"
        onClick={onMobileClose}
        aria-hidden="true"
      />
    )}
    <aside
      aria-label="Menú de navegación"
      className={`fixed left-0 top-16 bottom-0 bg-white z-40 flex flex-col justify-between py-5 border-r border-surface-container-high shadow-xs transition-all duration-300 ease-in-out overflow-y-auto ${
        collapsedView ? 'w-20' : 'w-64'
      } ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 md:shadow-xs`}
    >
      <div className={`flex flex-col gap-4 ${collapsedView ? 'px-2' : 'px-4'}`}>
        {/* ENCABEZADO DE NAVEGACIÓN Y BOTÓN COLAPSAR / EXPANDIR */}
        {collapsedView ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              title={`Expandir ${menuName}`}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-8 h-px bg-surface-container-high my-0.5" />
          </div>
        ) : (
          <div className="px-2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                {eyebrow}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                {title}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              title={`Ocultar ${menuName}`}
              className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LISTA DE ITEMS */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            if (collapsedView) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-semibold'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* PIE DEL MENÚ LATERAL */}
      {!collapsedView && footer && (
        <div className="px-4 pt-3 border-t border-surface-container-high space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-outline font-medium">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{footer.title}</span>
          </div>
          <p className="text-[10px] text-outline/80 leading-tight">{footer.text}</p>
        </div>
      )}
    </aside>
    </>
  );
};

export default PanelSidebar;
