import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MedicalKitDrawer from '../../src/frontend/src/components/MedicalKitDrawer';
import api from '../../src/frontend/src/services/api';

vi.mock('../../src/frontend/src/services/api', () => ({
  default: {
    getRecordAnatomicalNotes: vi.fn(),
    getPatientAnatomicalNotes: vi.fn(),
    createAnatomicalNote: vi.fn(),
    updateAnatomicalNote: vi.fn(),
    deleteAnatomicalNote: vi.fn(),
  },
}));

describe('Kit Informático Médico - Modelo Anatómico y Escala EVA (ISO/IEC 25010 & Res. 1995)', () => {
  const dummyPatient = {
    id: 'p-test-01',
    full_name: 'Carlos Ramírez Gómez',
    document_type: 'CC',
    document_number: '1118234567',
    eps_name: 'Sura EPS',
    affiliation_type: 'CONTRIBUTIVO',
    blood_type: 'O+',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getRecordAnatomicalNotes.mockResolvedValue([]);
    api.getPatientAnatomicalNotes.mockResolvedValue([]);
    api.createAnatomicalNote.mockImplementation((data) =>
      Promise.resolve({ ...data, id: 'note-uuid-123' })
    );
  });

  it('renderiza la escala de dolor EVA (0-10) con sus niveles y descripcion semiológica', async () => {
    await act(async () => {
      render(
        <MedicalKitDrawer
          isOpen={true}
          onClose={vi.fn()}
          patient={dummyPatient}
          readOnly={false}
        />
      );
    });

    expect(screen.getByText(/Escala Visual Analógica del Dolor \(EVA 0–10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 10/i)).toBeInTheDocument();
    expect(screen.getByText(/0: Sin dolor/i)).toBeInTheDocument();

    // Seleccionar nivel 7 (Dolor severo limitante)
    const btn7 = screen.getByRole('button', { name: '7' });
    await act(async () => {
      fireEvent.click(btn7);
    });

    expect(screen.getByText(/7 \/ 10/i)).toBeInTheDocument();
    expect(screen.getByText(/7: Severo limitante/i)).toBeInTheDocument();
  });

  it('permite alternar entre capas anatómicas y orientaciones anterior y posterior', async () => {
    await act(async () => {
      render(
        <MedicalKitDrawer
          isOpen={true}
          onClose={vi.fn()}
          patient={dummyPatient}
          readOnly={false}
        />
      );
    });

    // Alternar capa Ósea
    const boneBtn = screen.getByRole('button', { name: 'Ósea' });
    await act(async () => {
      fireEvent.click(boneBtn);
    });
    expect(screen.getByText(/bone/i)).toBeInTheDocument();

    // Alternar a vista Posterior
    const postBtn = screen.getByRole('button', { name: /Posterior \(Dorsal\)/i });
    await act(async () => {
      fireEvent.click(postBtn);
    });
    expect(screen.getAllByText(/posterior/i).length).toBeGreaterThanOrEqual(1);

    // Alternar capa Muscular
    const muscBtn = screen.getByRole('button', { name: 'Muscular' });
    await act(async () => {
      fireEvent.click(muscBtn);
    });
    expect(screen.getAllByText(/muscle/i).length).toBeGreaterThanOrEqual(1);
  });

  it('despliega los datos del paciente y pauta semiológica al seleccionar una estructura', async () => {
    await act(async () => {
      render(
        <MedicalKitDrawer
          isOpen={true}
          onClose={vi.fn()}
          patient={dummyPatient}
          readOnly={false}
        />
      );
    });

    // Asegurar capa de organos
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Órganos' }));
      fireEvent.click(screen.getByRole('button', { name: /Anterior \(Frontal\)/i }));
    });

    // Clic en la silueta interactiva del corazón
    const heartNode = document.querySelector('circle[fill="#E11D48"]');
    expect(heartNode).toBeTruthy();
    await act(async () => {
      fireEvent.click(heartNode);
    });

    // Debe abrir el modal con datos del paciente autocompletados
    await waitFor(() => {
      const patientMatches = screen.getAllByText('Carlos Ramírez Gómez');
      expect(patientMatches.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Corazón y Válvula Aórtica/i)).toBeInTheDocument();
      expect(screen.getByText(/Pauta Semiológica:/i)).toBeInTheDocument();
    });

    // Redactar hallazgo facultativo y guardar
    const obsInput = screen.getByPlaceholderText(/Dolor a la palpación profunda en punto de McBurney/i);
    await act(async () => {
      fireEvent.change(obsInput, {
        target: { value: 'Soplo sistólico en foco aórtico con irradiación.' },
      });
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Observación/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(api.createAnatomicalNote).toHaveBeenCalledTimes(1);
    });
  });

  it('permite al facultativo transferir los hallazgos directamente a la HCE', async () => {
    const onInjectMock = vi.fn();
    await act(async () => {
      render(
        <MedicalKitDrawer
          isOpen={true}
          onClose={vi.fn()}
          patient={dummyPatient}
          readOnly={false}
          onInjectToHCE={onInjectMock}
        />
      );
    });

    // Seleccionar nivel 6 de dolor
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '6' }));
    });

    // Transferir a HCE
    const transferBtn = screen.getByRole('button', { name: /Transferir Hallazgos a Historia Clínica/i });
    expect(transferBtn).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(transferBtn);
    });

    expect(onInjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        painScaleScore: 6,
        painScaleObservations: expect.any(String),
      })
    );
  });

  it('cumple con RBAC restringiendo a personal de enfermería a modo de SOLO LECTURA', async () => {
    await act(async () => {
      render(
        <MedicalKitDrawer
          isOpen={true}
          onClose={vi.fn()}
          patient={dummyPatient}
          readOnly={true}
        />
      );
    });

    // Debe mostrar la advertencia institucional de solo lectura
    expect(screen.getByText(/Modo Solo Lectura \(Enfermería\)/i)).toBeInTheDocument();

    // No debe existir el botón de transferir a HCE
    expect(screen.queryByRole('button', { name: /Transferir Hallazgos a Historia Clínica/i })).not.toBeInTheDocument();

    // Los botones de la escala EVA deben estar inhabilitados
    const btnEVA = screen.getByRole('button', { name: '5' });
    expect(btnEVA).toBeDisabled();
  });
});
