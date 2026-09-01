export interface MexicoState {
  name: string
  abbr: string
}

export interface MexicoRegion {
  name: string
  states: MexicoState[]
}

/** Los 32 estados de México, agrupados por región (de norte a sur). */
export const MEXICO_REGIONS: MexicoRegion[] = [
  {
    name: 'Noroeste',
    states: [
      { name: 'Baja California', abbr: 'BC' },
      { name: 'Baja California Sur', abbr: 'BCS' },
      { name: 'Sonora', abbr: 'SON' },
      { name: 'Sinaloa', abbr: 'SIN' },
      { name: 'Chihuahua', abbr: 'CHIH' },
      { name: 'Durango', abbr: 'DGO' },
    ],
  },
  {
    name: 'Noreste',
    states: [
      { name: 'Coahuila', abbr: 'COAH' },
      { name: 'Nuevo León', abbr: 'NL' },
      { name: 'Tamaulipas', abbr: 'TAMPS' },
      { name: 'San Luis Potosí', abbr: 'SLP' },
      { name: 'Zacatecas', abbr: 'ZAC' },
    ],
  },
  {
    name: 'Occidente',
    states: [
      { name: 'Nayarit', abbr: 'NAY' },
      { name: 'Jalisco', abbr: 'JAL' },
      { name: 'Colima', abbr: 'COL' },
      { name: 'Michoacán', abbr: 'MICH' },
      { name: 'Aguascalientes', abbr: 'AGS' },
      { name: 'Guanajuato', abbr: 'GTO' },
      { name: 'Querétaro', abbr: 'QRO' },
    ],
  },
  {
    name: 'Centro',
    states: [
      { name: 'Ciudad de México', abbr: 'CDMX' },
      { name: 'México', abbr: 'MEX' },
      { name: 'Morelos', abbr: 'MOR' },
      { name: 'Hidalgo', abbr: 'HGO' },
      { name: 'Tlaxcala', abbr: 'TLAX' },
      { name: 'Puebla', abbr: 'PUE' },
      { name: 'Veracruz', abbr: 'VER' },
      { name: 'Guerrero', abbr: 'GRO' },
    ],
  },
  {
    name: 'Sureste',
    states: [
      { name: 'Oaxaca', abbr: 'OAX' },
      { name: 'Chiapas', abbr: 'CHIS' },
      { name: 'Tabasco', abbr: 'TAB' },
      { name: 'Campeche', abbr: 'CAMP' },
      { name: 'Yucatán', abbr: 'YUC' },
      { name: 'Quintana Roo', abbr: 'QROO' },
    ],
  },
]

export function normalizeState(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

/** Alias comunes para mapear datos ingresados a los estados canónicos. */
const ALIASES: Record<string, string> = {
  cdmx: 'Ciudad de México',
  df: 'Ciudad de México',
  distritofederal: 'Ciudad de México',
  edomex: 'México',
  estadodemexico: 'México',
  qroo: 'Quintana Roo',
  quintanaroo: 'Quintana Roo',
}

export function resolveState(raw: string): MexicoState | undefined {
  const norm = normalizeState(raw)
  const alias = ALIASES[norm]
  if (alias) return MEXICO_REGIONS.flatMap((r) => r.states).find((s) => s.name === alias)
  return MEXICO_REGIONS.flatMap((r) => r.states).find((s) => normalizeState(s.name) === norm)
}
