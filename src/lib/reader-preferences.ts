export type Theme = 'dark' | 'light' | 'sepia' | 'navy' | 'paper';

export type FontFamily = 
  | 'space-mono'
  | 'georgia'
  | 'palatino'
  | 'times'
  | 'garamond'
  | 'baskerville'
  | 'caslon'
  | 'charter'
  | 'source-serif'
  | 'merriweather'
  | 'lora'
  | 'crimson'
  | 'libre-baskerville'
  | 'eb-garamond'
  | 'open-sans'
  | 'roboto'
  | 'inter'
  | 'system';

export type PageTurnMode = 'infinite-scroll' | 'slide' | 'curl';

export interface PageMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ParagraphSettings {
  override: boolean;
  spacing: number; // em units
  indentation: number; // em units
}

export interface LineHeightSettings {
  override: boolean;
  multiplier: number; // 1.0 to 3.0
}

export interface ReaderPreferences {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: number; // in px, 12-32
  pageTurnMode: PageTurnMode;
  pageMargins: PageMargins;
  paragraphSettings: ParagraphSettings;
  lineHeightSettings: LineHeightSettings;
  textAlign: 'left' | 'justify';
  maxWidth: number; // in px, 600-1200
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'dark',
  fontFamily: 'space-mono',
  fontSize: 16,
  pageTurnMode: 'infinite-scroll',
  pageMargins: {
    left: 24,
    right: 24,
    top: 32,
    bottom: 32,
  },
  paragraphSettings: {
    override: false,
    spacing: 1,
    indentation: 0,
  },
  lineHeightSettings: {
    override: false,
    multiplier: 1.75,
  },
  textAlign: 'left',
  maxWidth: 768,
};

export const THEMES = {
  dark: {
    name: 'Dark',
    background: '#020202',
    foreground: '#f4f4f4',
    muted: '#a1a1a1',
    mutedForeground: '#737373',
    border: '#27272a',
    hover: '#18181b',
    hoverForeground: '#ffffff',
    active: '#27272a',
    activeForeground: '#ffffff',
  },
  light: {
    name: 'Light',
    background: '#ffffff',
    foreground: '#1a1a1a',
    muted: '#71717a',
    mutedForeground: '#52525b',
    border: '#e4e4e7',
    hover: '#f4f4f5',
    hoverForeground: '#000000',
    active: '#e4e4e7',
    activeForeground: '#000000',
  },
  sepia: {
    name: 'Sepia',
    background: '#f4ecd8',
    foreground: '#5c4b37',
    muted: '#a08968',
    mutedForeground: '#6d5d4a',
    border: '#d4c5a9',
    hover: '#e8dfc5',
    hoverForeground: '#3d3020',
    active: '#d4c5a9',
    activeForeground: '#3d3020',
  },
  navy: {
    name: 'Navy',
    background: '#0f1419',
    foreground: '#e6edf3',
    muted: '#8b949e',
    mutedForeground: '#6e7681',
    border: '#1f2937',
    hover: '#1c2532',
    hoverForeground: '#ffffff',
    active: '#30363d',
    activeForeground: '#ffffff',
  },
  paper: {
    name: 'Paper',
    background: '#faf8f3',
    foreground: '#2e2e2e',
    muted: '#8a8a8a',
    mutedForeground: '#5a5a5a',
    border: '#e0ddd5',
    hover: '#f0ede5',
    hoverForeground: '#1a1a1a',
    active: '#e0ddd5',
    activeForeground: '#1a1a1a',
  },
};

export const FONT_FAMILIES = {
  'space-mono': { name: 'Space Mono', family: 'var(--font-space-mono, monospace)', type: 'monospace' },
  'georgia': { name: 'Georgia', family: 'Georgia, serif', type: 'serif' },
  'palatino': { name: 'Palatino', family: '"Palatino Linotype", Palatino, serif', type: 'serif' },
  'times': { name: 'Times New Roman', family: '"Times New Roman", Times, serif', type: 'serif' },
  'garamond': { name: 'Garamond', family: 'Garamond, serif', type: 'serif' },
  'baskerville': { name: 'Baskerville', family: 'Baskerville, serif', type: 'serif' },
  'caslon': { name: 'Caslon', family: '"Big Caslon", Caslon, serif', type: 'serif' },
  'charter': { name: 'Charter', family: 'Charter, serif', type: 'serif' },
  'source-serif': {
    name: 'Source Serif',
    family: 'var(--font-source-serif, "Source Serif Pro", serif)',
    type: 'serif',
  },
  'merriweather': { name: 'Merriweather', family: 'var(--font-merriweather, serif)', type: 'serif' },
  'lora': { name: 'Lora', family: 'var(--font-lora, serif)', type: 'serif' },
  'crimson': { name: 'Crimson Text', family: 'var(--font-crimson, serif)', type: 'serif' },
  'libre-baskerville': { name: 'Libre Baskerville', family: 'var(--font-libre-baskerville, serif)', type: 'serif' },
  'eb-garamond': { name: 'EB Garamond', family: 'var(--font-eb-garamond, serif)', type: 'serif' },
  'open-sans': { name: 'Open Sans', family: 'var(--font-open-sans, sans-serif)', type: 'sans-serif' },
  'roboto': { name: 'Roboto', family: 'var(--font-roboto, sans-serif)', type: 'sans-serif' },
  'inter': { name: 'Inter', family: 'var(--font-inter, sans-serif)', type: 'sans-serif' },
  'system': { name: 'System Default', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', type: 'sans-serif' },
};

export function getPreferencesFromStorage(): ReaderPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  
  try {
    const stored = localStorage.getItem('reader-preferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old 'night' theme to 'navy'
      if (parsed.theme === 'night') {
        parsed.theme = 'navy';
      }
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  
  return DEFAULT_PREFERENCES;
}

export function savePreferencesToStorage(preferences: ReaderPreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('reader-preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

