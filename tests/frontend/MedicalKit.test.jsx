import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PainScaleSelector from '../../src/frontend/src/components/PainScaleSelector';
import MedicalKitScreen, { getYoutubeEmbedUrl } from '../../src/frontend/src/screens/MedicalKitScreen';
import api from '../../src/frontend/src/services/api';

vi.mock('../../src/frontend/src/services/api', () => ({
  apiClient: {
    getHealthEducationPosts: vi.fn(),
    createHealthEducationPost: vi.fn(),
    updateHealthEducationPost: vi.fn(),
    deleteHealthEducationPost: vi.fn(),
  },
  default: {
    getHealthEducationPosts: vi.fn(),
    createHealthEducationPost: vi.fn(),
    updateHealthEducationPost: vi.fn(),
    deleteHealthEducationPost: vi.fn(),
  },
}));

describe('Kit Informático Médico: Muro de Salud & Escala EVA (ISO/IEC 25010 & Res. 1995)', () => {
  const doctorUser = {
    id: 'doc-001',
    full_name: 'Dr. Santiago Vélez',
    role: 'MEDICO',
    role_id: 2,
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Central',
  };

  const nurseUser = {
    id: 'nur-001',
    full_name: 'Enfermera Elizabeth',
    role: 'ENFERMERO',
    role_id: 3,
    specialty: 'Enfermería Asistencial',
    branch: 'Sede Cartago - Central',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getHealthEducationPosts.mockResolvedValue([]);
  });

  describe('1. Componente PainScaleSelector (Escala Visual Analógica EVA 0-10)', () => {
    it('renderiza la escala de dolor EVA (0-10) con sus niveles y descriptores semiológicos', () => {
      render(
        <PainScaleSelector
          value={0}
          onChange={vi.fn()}
          observations=""
          onObservationsChange={vi.fn()}
          readOnly={false}
          theme="light"
        />
      );

      expect(screen.getByText(/Escala Visual Analógica del Dolor \(EVA 0–10\)/i)).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 10/i)).toBeInTheDocument();
      expect(screen.getByText(/0: Sin dolor/i)).toBeInTheDocument();
      expect(screen.getByText(/Paciente asintomático, sin molestia nociceptiva/i)).toBeInTheDocument();
    });

    it('permite al usuario seleccionar un nivel de dolor y disparar onChange', () => {
      const handleChange = vi.fn();
      render(
        <PainScaleSelector
          value={3}
          onChange={handleChange}
          observations=""
          onObservationsChange={vi.fn()}
          readOnly={false}
          theme="light"
        />
      );

      const btn7 = screen.getByRole('button', { name: '7' });
      fireEvent.click(btn7);
      expect(handleChange).toHaveBeenCalledWith(7);
    });

    it('en modo readOnly no dispara onChange al hacer clic en los niveles', () => {
      const handleChange = vi.fn();
      render(
        <PainScaleSelector
          value={5}
          onChange={handleChange}
          observations="Dolor lumbar"
          onObservationsChange={vi.fn()}
          readOnly={true}
          theme="light"
        />
      );

      const btn8 = screen.getByRole('button', { name: '8' });
      fireEvent.click(btn8);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('2. Muro Clínico de Salud y Concientización (MedicalKitScreen)', () => {
    it('renderiza las categorías y publicaciones educativas en el muro', async () => {
      await act(async () => {
        render(<MedicalKitScreen user={doctorUser} onNavigate={vi.fn()} />);
      });

      expect(screen.getByText(/Kit Informático Médico: Muro de Salud & Concientización/i)).toBeInTheDocument();
      expect(screen.getByText('Todas las Categorías')).toBeInTheDocument();
      expect(screen.getAllByText('Consejos de Salud').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Esquema de Vacunas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Manejo de Enfermedades').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Esquema Nacional de Vacunación 2026/i)).toBeInTheDocument();
    });

    it('permite al médico ver el botón de Nueva Publicación y abrir el modal', async () => {
      await act(async () => {
        render(<MedicalKitScreen user={doctorUser} onNavigate={vi.fn()} />);
      });

      const newPostBtn = screen.getByTestId('create-health-post-btn');
      expect(newPostBtn).toBeInTheDocument();

      fireEvent.click(newPostBtn);
      expect(screen.getByText('Nueva Publicación en el Muro Clínico')).toBeInTheDocument();
      expect(screen.getByText('Título de la Publicación *')).toBeInTheDocument();
    });

    it('el enfermero tiene acceso de SOLO LECTURA sin botones de crear, editar o eliminar', async () => {
      await act(async () => {
        render(<MedicalKitScreen user={nurseUser} onNavigate={vi.fn()} />);
      });

      // No debe existir el botón de crear publicación
      expect(screen.queryByTestId('create-health-post-btn')).not.toBeInTheDocument();
      // No deben existir botones de editar o eliminar
      expect(screen.queryByTitle('Editar publicación')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Eliminar publicación')).not.toBeInTheDocument();
      // Debe mostrar el distintivo de modo enfermería
      expect(screen.getByText(/Modo Enfermería: Solo Lectura & Sincronización Continua/i)).toBeInTheDocument();
    });

    it('función getYoutubeEmbedUrl transforma enlaces válidos de YouTube', () => {
      expect(getYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      );
      expect(getYoutubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      );
      expect(getYoutubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ'
      );
      expect(getYoutubeEmbedUrl('invalid-url')).toBeNull();
      expect(getYoutubeEmbedUrl('')).toBeNull();
    });
  });
});
