// PostCSS pipeline. `postcss-prefix-selector` scopes NES.css selectors under `.rpg-ui`
// so the global resets (html, body, *) NES.css ships with don't leak into productivity views.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-prefix-selector': {
      prefix: '.rpg-ui',
      transform(prefix, selector, prefixedSelector, filePath) {
        if (!filePath || !filePath.includes('nes.css')) return selector
        if (selector === 'html' || selector === 'body' || selector === '*') return prefix
        return prefixedSelector
      }
    }
  }
}

export default config
