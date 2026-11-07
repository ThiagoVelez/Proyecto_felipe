// Configuracion de ESLint 9 (flat config) usada por el workflow .github/workflows/calidad.yml.
// Las dependencias se instalan en CI con `npm i --no-save` para no alterar package.json del equipo
// (decision pendiente registrada en docs/calidad/06-plan-mantenimiento.md).
//
// Criterio: las reglas que indican defectos (hooks mal usados, variables no definidas, claves
// duplicadas) son errores y bloquean el pipeline. Las variables sin uso se reportan como
// advertencia porque la linea base tiene 65 casos de deuda tecnica (DEF-44).
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    files: ['src/setupTests.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
];
