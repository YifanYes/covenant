// PostCSS pipeline. `postcss-prefix-selector` scopes NES.css selectors under `.rpg-ui`
// so the global resets (html, body, *) NES.css ships with don't leak into productivity views.
// We map html/body/* to an unmatchable selector instead of `.rpg-ui` so NES.css's hardcoded
// light-mode body styles (background:#fff; color:#212529) don't override our theme tokens.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-prefix-selector': {
      prefix: '.rpg-ui',
      transform(prefix, selector, prefixedSelector, filePath) {
        if (!filePath || !filePath.includes('nes.css')) return selector
        if (selector === 'html' || selector === 'body' || selector === '*') return ':not(*)'
        return prefixedSelector
      }
    }
  }
}

export default config
