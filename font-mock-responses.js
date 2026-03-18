// Mock responses for next/font/google - avoids network calls to fonts.googleapis.com
// Used when NEXT_FONT_GOOGLE_MOCKED_RESPONSES env var points to this file.
// Font files are read from local paths (absolute paths starting with /) by Next.js.

const GEIST_WOFF2 = '/Users/ianbaron/Documents/projects/propra/node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2';
const INSTR_SERIF_REGULAR = '/Users/ianbaron/Documents/projects/propra/public/fonts/instrument-serif-regular.woff2';
const INSTR_SERIF_ITALIC = '/Users/ianbaron/Documents/projects/propra/public/fonts/instrument-serif-italic.woff2';

module.exports = {
  // Geist variable font - wght 100-900, latin subset
  'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap': `/* latin */
@font-face {
  font-family: 'Geist';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(${GEIST_WOFF2}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`,

  // Instrument Serif - normal and italic, weight 400, latin subset
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&display=swap': `/* latin */
@font-face {
  font-family: 'Instrument Serif';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${INSTR_SERIF_REGULAR}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* latin */
@font-face {
  font-family: 'Instrument Serif';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url(${INSTR_SERIF_ITALIC}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`,
};
