import js from '@eslint/js'
import i18nJsonPlugin from 'eslint-plugin-i18n-json'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import path from 'path'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['dist'] },

  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript configurations
  ...tseslint.configs.recommended,

  // Main configuration for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // i18n JSON configuration
  {
    files: ['public/locales/**/*.json'],
    plugins: {
      'i18n-json': i18nJsonPlugin
    },
    processor: i18nJsonPlugin.processors['.json'],
    rules: {
      ...i18nJsonPlugin.configs.recommended.rules,
      'i18n-json/valid-message-syntax': 'off',
      'i18n-json/identical-keys': [
        2,
        {
          filePath: {
            'public/locales/en/translation.json': path.resolve('public/locales/en/translation.json'),
            'public/locales/es/translation.json': path.resolve('public/locales/es/translation.json')
          }
        }
      ],
      'i18n-json/sorted-keys': [2]
    }
  }
]
