import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// DEF-90: se prueba el componente real, no una copia definida en la prueba
import AllergyAlertModal from '../../src/frontend/src/components/AllergyAlertModal';

const props = {
  isOpen: true,
  activeIngredient: 'BETALACTAMICOS',
  severity: 'SEVERA',
  medicationName: 'Amoxicilina 500 mg',
  message: 'Conflicto alérgico detectado por el servidor',
};

describe('AllergyAlertModal (componente real)', () => {
  it('no se muestra cerrado y abierto es un diálogo accesible con los datos del conflicto', () => {
    const { rerender } = render(<AllergyAlertModal {...props} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<AllergyAlertModal {...props} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /Contraindicacion Farmacologica/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Amoxicilina 500 mg')).toBeInTheDocument();
    expect(screen.getByTestId('allergy-active-ingredient')).toHaveTextContent('BETALACTAMICOS');
    expect(screen.getByTestId('allergy-server-message')).toHaveTextContent(/servidor/);
    // El foco inicial queda en la acción segura (cancelar la prescripción)
    expect(screen.getByRole('button', { name: /Entendido \/ Cancelar Prescripcion/i })).toHaveFocus();
  });

  it('cancelar llama a onClose', () => {
    const onClose = vi.fn();
    render(<AllergyAlertModal {...props} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Entendido \/ Cancelar Prescripcion/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omitir la alerta exige confirmar el riesgo antes', () => {
    const onOverride = vi.fn();
    render(<AllergyAlertModal {...props} onClose={vi.fn()} onOverride={onOverride} />);
    const omitir = screen.getByRole('button', { name: /Omitir Alerta bajo Criterio/i });

    expect(omitir).toBeDisabled();
    fireEvent.click(omitir);
    expect(onOverride).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(omitir).toBeEnabled();
    fireEvent.click(omitir);
    expect(onOverride).toHaveBeenCalledTimes(1);
  });

  it('sin onOverride no ofrece omitir la alerta', () => {
    render(<AllergyAlertModal {...props} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Omitir Alerta/i })).not.toBeInTheDocument();
  });

  it('usa colores de texto con contraste AAA en el dato crítico (DEF-90)', () => {
    render(<AllergyAlertModal {...props} onClose={vi.fn()} />);
    // red-900 sobre el fondo de la tarjeta: 9,84:1 (docs/calidad/evidencias/v2/def90-contraste-modal-alergias.txt)
    expect(screen.getByTestId('allergy-active-ingredient').className).toMatch(/text-red-9[05]0/);
  });
});
