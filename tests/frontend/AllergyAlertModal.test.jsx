import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Simulacion del componente AllergyAlertModal segun los requerimientos de interfaz
const AllergyAlertModal = ({ isOpen, activeIngredient, severity, medicationName, onClose }) => {
  if (!isOpen) return null;

  const isSevere = severity === 'SEVERA';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="allergy-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div
        className={`w-full max-w-md p-6 rounded-lg shadow-xl border-2 ${
          isSevere ? 'bg-red-50 border-red-600 text-red-900' : 'bg-yellow-50 border-yellow-600 text-yellow-900'
        }`}
        data-testid="allergy-modal-card"
      >
        <h2 id="allergy-alert-title" className="text-xl font-bold uppercase tracking-wide">
          Alerta Critica: Contraindicacion Farmacologica
        </h2>
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold">Medicamento recetado:</span> {medicationName}
          </p>
          <p>
            <span className="font-semibold">Principio activo conflictivo:</span> {activeIngredient}
          </p>
          <p>
            <span className="font-semibold">Severidad del riesgo:</span>{' '}
            <span className={`px-2 py-0.5 rounded font-bold ${isSevere ? 'bg-red-200 text-red-900' : 'bg-yellow-200 text-yellow-900'}`}>
              {severity}
            </span>
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded transition-colors"
          >
            Entendido / Cancelar Prescripcion
          </button>
        </div>
      </div>
    </div>
  );
};

describe('AllergyAlertModal - Intercepcion Visual de Seguridad Farmacologica', () => {
  it('debe renderizarse con borde y estilo de alerta roja ante severidad SEVERA', () => {
    const mockProps = {
      isOpen: true,
      activeIngredient: 'BETALACTAMICOS',
      severity: 'SEVERA',
      medicationName: 'Amoxil 500mg (Amoxicilina)',
      onClose: () => {},
    };

    render(<AllergyAlertModal {...mockProps} />);

    // Verificar presencia del titulo accesible
    const titleElement = screen.getByRole('heading', { level: 2 });
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toContain('Alerta Critica');

    // Verificar presencia de la advertencia del principio activo
    expect(screen.getByText(/BETALACTAMICOS/i)).toBeTruthy();

    // Verificar aplicacion de clases de color rojo estricto para severidad critica
    const modalCard = screen.getByTestId('allergy-modal-card');
    expect(modalCard.className).toContain('border-red-600');
    expect(modalCard.className).toContain('bg-red-50');
  });

  it('no debe renderizar nada en el DOM cuando isOpen es false', () => {
    const mockProps = {
      isOpen: false,
      activeIngredient: 'BETALACTAMICOS',
      severity: 'SEVERA',
      medicationName: 'Amoxil 500mg',
      onClose: () => {},
    };

    const { container } = render(<AllergyAlertModal {...mockProps} />);
    expect(container.firstChild).toBeNull();
  });
});
