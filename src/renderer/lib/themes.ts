// Color themes for Settings > Display. Their colors live in globals.css under
// html[data-palette='<id>']; 'classic' is the default and needs no block.

export interface Theme {
  id: string
  name: string
  /** Where the colors come from */
  from: string
  /** Page, Today panel and accent, for the picker */
  swatch: [string, string, string]
}

export const THEMES: Theme[] = [
  { id: 'classic', name: 'Classic', from: 'The app\'s own ivory and Today green', swatch: ['#f7f5ef', '#003c33', '#ff7759'] },
  { id: 'taximeter', name: 'Taximeter', from: 'Taxi meters: warm grey, black, one red', swatch: ['#e9e6df', '#1d1d1b', '#d8432c'] },
  { id: 'kraft', name: 'Kraft', from: 'Muji notebooks: kraft paper, ash, rust', swatch: ['#e8dfcf', '#4a4640', '#a33b2a'] },
  { id: 'ledger', name: 'Ledger', from: 'Accounting paper, for the earnings: green rules, navy ink, red total', swatch: ['#eef2e8', '#1b2a3a', '#c8322f'] },
  { id: 'index-card', name: 'Index Card', from: 'Study index cards: cream, blue lines, red margin', swatch: ['#fbf8ef', '#fffdf6', '#d9534f'] },
  { id: 'et66', name: 'ET66', from: 'Braun ET66 calculator: black body, brown keys, yellow equals', swatch: ['#2a2826', '#4a3b2c', '#f2b705'] },
  { id: 'sbb', name: 'Signal', from: 'Swiss railway signage: the red panel with white type', swatch: ['#f6f6f6', '#c8102e', '#111111'] },
  { id: 'railway', name: 'Railway', from: 'Swiss railway clock and Braun clocks', swatch: ['#f3f1ec', '#151514', '#e8b21e'] },
  { id: 'highlighter', name: 'Highlighter', from: 'Graphite pencil and a pink highlighter', swatch: ['#f5f5f2', '#2b2b2e', '#e8407e'] },
  { id: 'railway-night', name: 'Railway Night', from: 'Railway after dark', swatch: ['#121211', '#2e2d29', '#e8b21e'] },
  { id: 'ambient', name: 'Ambient', from: 'The app\'s green, deepened', swatch: ['#eef1ee', '#0c1a17', '#ff7759'] },
]

/** Put the chosen theme on the page (classic clears it). */
export function applyTheme(id: string) {
  if (id === 'classic' || !THEMES.some((t) => t.id === id)) delete document.documentElement.dataset.palette
  else document.documentElement.dataset.palette = id
}
