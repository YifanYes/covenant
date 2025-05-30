import js from '@eslint/js'
import i18nJsonPlugin from 'eslint-plugin-i18n-json'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import path from 'path'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintPluginPrettierRecommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    files: ['public/locales/**/*.json'],
    plugins: { 'i18n-json': i18nJsonPlugin },
    processor: {
      meta: { name: '.json' },
      ...i18nJsonPlugin.processors['.json']
    },
    rules: {
      ...i18nJsonPlugin.configs.recommended.rules,
      'i18n-json/valid-message-syntax': 'off',
      'i18n-json/identical-keys': [
        2,
        {
          filePath: {
            'translation.json': path.resolve('public/locales/en/translation.json'),
            'translation.json': path.resolve('public/locales/es/translation.json')
          }
        }
      ],
      'i18n-json/sorted-keys': [2]
    }
  }
)
