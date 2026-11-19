export interface M3ColorOption {
  hex: string;
  name: string;
  containerHex: string;
  onContainerHex: string;
}

/**
 * Paleta unificada, colorida y juguetona inspirada en las tarjetas de eventos.
 * Combina tonos vivos, expresivos y llenos de energía para identificar a artistas y cuentas.
 */
export const M3_EXPRESSIVE_PALETTE: M3ColorOption[] = [
  // 1. Tonos centrales unificados con las tarjetas de eventos
  {
    hex: '#5D50EE',
    name: 'Violeta Eléctrico',
    containerHex: '#EEECFD',
    onContainerHex: '#2E22A6',
  },
  {
    hex: '#E5484D',
    name: 'Coral Fuego',
    containerHex: '#FDECEE',
    onContainerHex: '#921D21',
  },
  {
    hex: '#F5B843',
    name: 'Ámbar Solar',
    containerHex: '#FEF6E7',
    onContainerHex: '#7A5200',
  },
  {
    hex: '#0D9488',
    name: 'Turquesa Jade',
    containerHex: '#E6F7F5',
    onContainerHex: '#054B45',
  },
  {
    hex: '#2563EB',
    name: 'Azul Zafiro',
    containerHex: '#EBF2FE',
    onContainerHex: '#133887',
  },

  // 2. Colores vibrantes y juguetones adicionales
  {
    hex: '#EC4899',
    name: 'Rosa Chicle',
    containerHex: '#FDEEF6',
    onContainerHex: '#8C1753',
  },
  {
    hex: '#8B5CF6',
    name: 'Lavanda Intenso',
    containerHex: '#F3EFFE',
    onContainerHex: '#48209E',
  },
  {
    hex: '#06B6D4',
    name: 'Celeste Aqua',
    containerHex: '#E6F8FB',
    onContainerHex: '#045866',
  },
  {
    hex: '#10B981',
    name: 'Menta Esmeralda',
    containerHex: '#E7FAF3',
    onContainerHex: '#07593E',
  },
  {
    hex: '#84CC16',
    name: 'Lima Neón',
    containerHex: '#F3FBE8',
    onContainerHex: '#406606',
  },
  {
    hex: '#F97316',
    name: 'Mandarina Pop',
    containerHex: '#FEF1E8',
    onContainerHex: '#8C3B04',
  },
  {
    hex: '#D946EF',
    name: 'Magenta Radiante',
    containerHex: '#FBEEFE',
    onContainerHex: '#771287',
  },
  {
    hex: '#14B8A6',
    name: 'Verde Caribe',
    containerHex: '#E8FAF7',
    onContainerHex: '#0A5F56',
  },
  {
    hex: '#3B82F6',
    name: 'Azul Cielo',
    containerHex: '#EEF4FE',
    onContainerHex: '#174EAE',
  },
  {
    hex: '#F43F5E',
    name: 'Frambuesa Viva',
    containerHex: '#FEECEF',
    onContainerHex: '#8B132A',
  },
  {
    hex: '#6366F1',
    name: 'Índigo Iris',
    containerHex: '#EFF0FE',
    onContainerHex: '#2E33A8',
  },
  {
    hex: '#EAB308',
    name: 'Amarillo Sol',
    containerHex: '#FEF9E7',
    onContainerHex: '#705400',
  },
  {
    hex: '#A855F7',
    name: 'Púrpura Orquídea',
    containerHex: '#F7EFFE',
    onContainerHex: '#5B1FA0',
  },
];

export const M3_EXPRESSIVE_COLORS = M3_EXPRESSIVE_PALETTE.map((c) => c.hex);

export const M3_DEFAULT_PARTICIPANT_COLOR = M3_EXPRESSIVE_COLORS[0]; // #5D50EE
export const M3_DEFAULT_SHARED_COLOR = M3_EXPRESSIVE_COLORS[3]; // #0D9488

/**
 * Mapeo de colores antiguos u oscuros hacia la paleta vibrante y juguetona
 * para armonizar eventos existentes automáticamente sin perder distinción de participantes.
 */
export const LEGACY_COLOR_MAP: Record<string, string> = {
  // Antiguos oscuros Tone 40
  '#6750A4': '#5D50EE', // Violeta Iris -> Violeta Eléctrico
  '#0061A4': '#2563EB', // Zafiro Océano -> Azul Zafiro
  '#006D44': '#0D9488', // Esmeralda Jade -> Turquesa Jade
  '#A23F16': '#F97316', // Terracota Cálido -> Mandarina Pop
  '#825500': '#F5B843', // Ámbar Miel -> Ámbar Solar
  '#984061': '#EC4899', // Frambuesa Silvestre -> Rosa Chicle
  '#006874': '#06B6D4', // Turquesa Glaciar -> Celeste Aqua
  '#8F4C38': '#E5484D', // Naranja Atardecer -> Coral Fuego
  '#4F5B92': '#6366F1', // Índigo Eléctrico -> Índigo Iris
  '#556429': '#84CC16', // Oliva Musgo -> Lima Neón
  '#7C5295': '#8B5CF6', // Ciruela Intenso -> Lavanda Intenso
  '#006C51': '#10B981', // Menta Fresca -> Menta Esmeralda
  '#B3261E': '#E5484D', // Rubí Carmín -> Coral Fuego
  // Genéricos Tailwind básicos
  '#EF4444': '#E5484D',
};

/**
 * Calcula dinámicamente si el texto sobre un fondo de color debe ser blanco o negro carbón
 * basándose en luminancia relativa WCAG 2.1.
 */
export function getContrastTextColor(hexColor: string): '#FFFFFF' | '#1D1B20' {
  const cleaned = hexColor.replace('#', '');
  const fullHex =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  if (fullHex.length !== 6) return '#FFFFFF';
  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? '#1D1B20' : '#FFFFFF';
}

export function harmonizeColorToM3(color: string): string {
  const upper = color.toUpperCase();
  return LEGACY_COLOR_MAP[upper] ?? color;
}

export function getM3ColorName(hex: string): string {
  const upper = hex.toUpperCase();
  const found = M3_EXPRESSIVE_PALETTE.find((c) => c.hex.toUpperCase() === upper);
  return found?.name ?? hex;
}
