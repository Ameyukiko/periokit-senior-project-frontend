import type { SiteIndex } from './chart.types'

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH]

export const UPPER_ARCH = [
  [18, 17, 16, 15, 14],
  [13, 12, 11, 21, 22, 23],
  [24, 25, 26, 27, 28]
]

export const LOWER_ARCH = [
  [48, 47, 46, 45, 44],
  [43, 42, 41, 31, 32, 33],
  [34, 35, 36, 37, 38]
]

export const BUCCAL_ROWS = ['Implant', 'Mobility', 'Keratinized', 'Furcation', 'BOP', 'PI', 'Recession', 'PD', 'CAL']
export const INNER_SURFACE_ROWS = ['CAL', 'PD', 'Recession', 'PI', 'BOP', 'Furcation', 'Keratinized', 'Mobility', 'Implant']
export const LINGUAL_ROWS = ['Keratinized', 'Furcation', 'BOP', 'PI', 'Recession', 'PD', 'CAL']
export const PALATAL_ROWS = ['CAL', 'PD', 'Recession', 'PI', 'BOP', 'Furcation', 'Keratinized']
export const SITE_INDEXES: SiteIndex[] = [0, 1, 2]

export const CHART_LEGEND_ITEMS = {
  Implant: 'Implant marker',
  Mobility: 'Grade 0-3',
  Keratinized: 'Width in mm',
  Furcation: 'Grade 0-3',
  BOP: ' Red ',
  PI: '  Blue ',
  Recession: 'Recession in mm',
  PD: 'Depth in mm',
  CAL: 'Level in mm',
  Ext: 'Extracted tooth'
}

// ISO 3166-1 alpha-2 codes, named by the browser so the list needs no upkeep.
// Thailand leads because nearly every patient is Thai.
const COUNTRY_CODES =
  'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ')

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export const COUNTRY_NAMES: string[] = [
  'Thailand',
  ...COUNTRY_CODES.map(code => regionNames.of(code) ?? code).sort((a, b) => a.localeCompare(b)),
]
