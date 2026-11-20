import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 5000 });
import { afterEach } from 'vitest';

// La sesion vive en sessionStorage (una por pestaña): se limpia entre pruebas
afterEach(() => {
  sessionStorage.clear();
});
