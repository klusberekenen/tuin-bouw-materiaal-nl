export type TrailerStatus = 'kofferbak' | 'veilig' | 'overbelading';

export interface AanhangerCheck {
  weightKg: number;
  maxPayloadKg: number;
  tmmKg: number;
  ritten: number;
  status: TrailerStatus;
  loadPct: number;
  badgeText: string;
  detailText: string;
}

export interface BigBagPricing {
  bigBag10Eur: number;
  bigBag07Eur: number;
  bigBag05Eur: number;
}

export interface BigBagPlan {
  n10: number;
  n07: number;
  n05: number;
  totalBags: number;
  totalVolumeM3: number;
  totalCostEur: number;
  label: string;
  shortLabel: string;
}

export interface BetonInput {
  mode: 'vlak' | 'palen';
  lengte: number;
  breedte: number;
  dikte: number;
  verlies: number;
  zakPrijs: number;
  maxPayloadKg: number;
  aantalPalen: number;
  palenMethode: 'vuistregel' | 'geometrie';
  zakkenPerPaal: number;
  gatDiameterCm: number;
  gatDiepteCm: number;
  paalBreedteCm: number;
}

export interface BetonResult {
  mode: 'vlak' | 'palen';
  areaM2: number;
  vNettoM3: number;
  vBrutoM3: number;
  zakken25: number;
  weightKg: number;
  waterLiter: number;
  zakkenCostEur: number;
  stortbetonEstEur: number;
  stortbetonAlert: boolean;
  aanhanger: AanhangerCheck;
}

export interface BetonSelfMix123Options {
  lossPct?: number;
  maxPayloadKg?: number;
}

export interface BetonSelfMix123Result {
  ratioVolume: string;
  volumeNettoM3: number;
  volumeBrutoM3: number;
  cementKg: number;
  cementBags25: number;
  betonzandM3: number;
  betonzandKg: number;
  betongrindM3: number;
  betongrindKg: number;
  waterLiter: number;
  totalDryWeightKg: number;
  totalWetWeightKg: number;
  aanhanger: AanhangerCheck;
}

export interface GrindInput {
  lengte: number;
  breedte: number;
  dikte: number;
  materiaal: string;
  extra: number;
  grindmatten: boolean;
  zakPrijs: number;
  bigBag10Eur: number;
  maxPayloadKg: number;
}

export interface GrindResult {
  areaM2: number;
  vNettoM3: number;
  vBrutoM3: number;
  densityKgM3: number;
  materiaalId: string;
  materiaalLabel: string;
  weightKg: number;
  zakken25: number;
  zakkenCostEur: number;
  bigBags: BigBagPlan;
  savingsEur: number;
  worteldoekM2: number;
  grindmattenCount: number;
  aanhanger: AanhangerCheck;
}

export interface ZandInput {
  lengte: number;
  breedte: number;
  dikte: number;
  zandsoort: string;
  inklink: number;
  zakPrijs: number;
  bigBag10Eur: number;
  maxPayloadKg: number;
}

export interface ZandResult {
  areaM2: number;
  vNettoM3: number;
  vBrutoM3: number;
  densityKgM3: number;
  zandId: string;
  zandLabel: string;
  weightKg: number;
  zakken25: number;
  zakkenCostEur: number;
  bigBags: BigBagPlan;
  savingsEur: number;
  aanhanger: AanhangerCheck;
}

export interface TuintegelsInput {
  lengte: number;
  breedte: number;
  tegel: string;
  legverband: 'recht' | 'halfsteens' | 'diagonaal';
  snijverlies: number;
  zandbedDikte: number;
  zandInklink: number;
  maxPayloadKg: number;
}

export interface TuintegelsResult {
  areaNettoM2: number;
  areaBrutoM2: number;
  tileId: string;
  tileLabel: string;
  tileWeightKg: number;
  tileThicknessCm: number;
  tileCategory: 'tegel' | 'klinker' | string;
  tegelsCount: number;
  tegelsWeightKg: number;
  aanhanger: AanhangerCheck;
  zandNettoM3: number;
  zandBrutoM3: number;
  zandWeightKg: number;
  zandBigBags: BigBagPlan;
  voegzandKg: number;
  opsluitbandenStuks: number;
}

export const AGGREGATES_NL: Readonly<Record<string, unknown>>;
export const BETON_PRESETS_NL: Readonly<Record<string, unknown>>;
export const TUINTEGELS_LOGISTICS_NL: Readonly<Record<string, unknown>>;

export const DEFAULT_BETON_INPUT: Readonly<BetonInput>;
export const DEFAULT_GRIND_INPUT: Readonly<GrindInput>;
export const DEFAULT_ZAND_INPUT: Readonly<ZandInput>;
export const DEFAULT_TUINTEGELS_INPUT: Readonly<TuintegelsInput>;

export function clamp(val: number, min: number, max: number): number;
export function parseNlNumber(
  raw: string | number | null | undefined,
  fallback: number,
  min?: number,
  max?: number
): number;
export function fmtNum(value: number, decimals?: number): string;
export function fmtInt(value: number): string;
export function fmtEur(value: number, decimals?: number): string;
export function fmtTon(weightKg: number): string;

export function calcAanhanger(weightKg: number, maxPayloadKg?: number): AanhangerCheck;
export function calcBigBags(volumeBrutoM3: number, pricing?: BigBagPricing): BigBagPlan;

export function calcBeton(raw?: Partial<BetonInput>): BetonResult;
export function calcBetonSelfMix123(
  volumeM3: number,
  options?: BetonSelfMix123Options
): BetonSelfMix123Result;
export function calcGrind(raw?: Partial<GrindInput>): GrindResult;
export function calcZand(raw?: Partial<ZandInput>): ZandResult;
export function calcTuintegels(raw?: Partial<TuintegelsInput>): TuintegelsResult;
