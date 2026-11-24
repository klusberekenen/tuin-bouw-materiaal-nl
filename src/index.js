import { readFileSync } from 'node:fs';

function loadJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

export const AGGREGATES_NL = Object.freeze(loadJson('../data/aggregates-nl-2026.json'));
export const BETON_PRESETS_NL = Object.freeze(loadJson('../data/beton-presets-nl.json'));
export const TUINTEGELS_LOGISTICS_NL = Object.freeze(loadJson('../data/tuintegels-logistics-nl.json'));

const LOGISTICS = TUINTEGELS_LOGISTICS_NL.logistics;

// ==========================================
// NEDERLANDSE GETALNOTATIE & PARSER
// ==========================================

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function parseNlNumber(raw, fallback, min = 0, max = 100000) {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fallback;
    return clamp(raw, min, max);
  }
  const s = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!s) return fallback;

  let normalized = s;
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

export function fmtNum(value, decimals = 2) {
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = safe.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${withThousands},${decPart}` : withThousands;
}

export function fmtInt(value) {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmtEur(value, decimals = 2) {
  return `€ ${fmtNum(value, decimals)}`;
}

export function fmtTon(weightKg) {
  return `${fmtNum(weightKg / 1000, 2)} ton`;
}

// ==========================================
// LOGISTIEK: 750 KG AANHANGER & BIG BAG PLANNER
// ==========================================

/**
 * Rijksoverheid / RDW 750 kg ongeremde aanhangwagen (rijbewijs B).
 * Standaard leeggewicht 200 kg -> netto laadvermogen 550 kg.
 */
export function calcAanhanger(weightKg, maxPayloadKg = LOGISTICS.defaultMaxPayloadKg) {
  const safeWeight = Math.max(0, Number.isFinite(weightKg) ? weightKg : 0);
  const payload = clamp(
    Number.isFinite(maxPayloadKg) ? maxPayloadKg : LOGISTICS.defaultMaxPayloadKg,
    250,
    700
  );
  const ritten = safeWeight <= 0 ? 0 : Math.ceil(safeWeight / payload - 1e-9);
  const loadPct = Math.round((safeWeight / payload) * 100);

  if (safeWeight <= LOGISTICS.carTrunkMaxKg) {
    return {
      weightKg: safeWeight,
      maxPayloadKg: payload,
      tmmKg: LOGISTICS.trailerTmmKg,
      ritten: safeWeight <= 0 ? 0 : Math.max(1, ritten),
      status: 'kofferbak',
      loadPct,
      badgeText: 'Kofferbak OK (≤ 350 kg)',
      detailText: `Totaal ${fmtInt(safeWeight)} kg past verdeeld over een personenauto of in 1 rit met een 750 kg aanhanger.`,
    };
  }

  if (safeWeight <= payload) {
    return {
      weightKg: safeWeight,
      maxPayloadKg: payload,
      tmmKg: LOGISTICS.trailerTmmKg,
      ritten: 1,
      status: 'veilig',
      loadPct,
      badgeText: '1 rit veilig met 750 kg aanhanger',
      detailText: `${fmtInt(safeWeight)} kg blijft binnen het netto laadvermogen van ${fmtInt(payload)} kg (750 kg TMM − 200 kg eigen gewicht).`,
    };
  }

  return {
    weightKg: safeWeight,
    maxPayloadKg: payload,
    tmmKg: LOGISTICS.trailerTmmKg,
    ritten,
    status: 'overbelading',
    loadPct,
    badgeText: `Let op: ${ritten} ritten nodig (overbelading bij 1 rit)`,
    detailText: `${fmtInt(safeWeight)} kg overschrijdt de ${fmtInt(payload)} kg netto limiet van een ongeremde 750 kg aanhanger — minimaal ${ritten} ritten of Big Bag thuisbezorging aanbevolen.`,
  };
}

/**
 * Optimale Big Bag combinatie (1,0 m³ / 0,7 m³ / 0,5 m³).
 */
export function calcBigBags(volumeBrutoM3, pricing = AGGREGATES_NL.grindPricing) {
  const safeVol = Number.isFinite(volumeBrutoM3) ? volumeBrutoM3 : 0;
  const v = Math.max(0, Number(safeVol.toFixed(6)));
  let n10 = Math.floor(v);
  const rem = Number((v - n10).toFixed(6));
  let n07 = 0;
  let n05 = 0;

  if (rem > 0.7) {
    n10 += 1;
  } else if (rem > 0.5) {
    n07 = 1;
  } else if (rem > 0.000001) {
    n05 = 1;
  }

  const parts = [];
  const compactParts = [];
  if (n10 > 0) {
    parts.push(`${n10}× 1,0 m³`);
    compactParts.push(`${n10}×1 m³`);
  }
  if (n07 > 0) {
    parts.push(`${n07}× 0,7 m³`);
    compactParts.push(`${n07}×0,7 m³`);
  }
  if (n05 > 0) {
    parts.push(`${n05}× 0,5 m³`);
    compactParts.push(`${n05}×0,5 m³`);
  }

  const label = parts.length > 0 ? `${parts.join(' + ')} Big Bag` : '0 Big Bags';
  const shortLabel = compactParts.length > 0 ? compactParts.join(' + ') : '0 m³';
  const totalVolumeM3 = Number((n10 * 1.0 + n07 * 0.7 + n05 * 0.5).toFixed(2));
  const totalCostEur = Number(
    (n10 * pricing.bigBag10Eur + n07 * pricing.bigBag07Eur + n05 * pricing.bigBag05Eur).toFixed(2)
  );

  return {
    n10,
    n07,
    n05,
    totalBags: n10 + n07 + n05,
    totalVolumeM3,
    totalCostEur,
    label,
    shortLabel,
  };
}

// ==========================================
// 1. BETON BEREKENEN (25 KG ZAKKEN + 1-2-3 ZELF MENGEN)
// ==========================================

export const DEFAULT_BETON_INPUT = Object.freeze({
  mode: 'vlak',
  lengte: 4,
  breedte: 3,
  dikte: 12,
  verlies: BETON_PRESETS_NL.defaultLossPct,
  zakPrijs: BETON_PRESETS_NL.defaultBagPriceEur,
  maxPayloadKg: LOGISTICS.defaultMaxPayloadKg,
  aantalPalen: 10,
  palenMethode: 'vuistregel',
  zakkenPerPaal: 2,
  gatDiameterCm: 25,
  gatDiepteCm: 65,
  paalBreedteCm: 9,
});

export function calcBeton(raw = {}) {
  const input = { ...DEFAULT_BETON_INPUT, ...raw };
  let areaM2 = Math.max(0, input.lengte) * Math.max(0, input.breedte);
  let vNettoM3 = 0;
  let vBrutoM3 = 0;
  let zakken25 = 0;

  if (input.mode === 'palen') {
    const palen = Math.max(1, Math.round(input.aantalPalen));
    if (input.palenMethode === 'geometrie') {
      const r = (Math.max(1, input.gatDiameterCm) / 100) / 2;
      const side = Math.max(0, input.paalBreedteCm) / 100;
      const h = Math.max(1, input.gatDiepteCm) / 100;
      const singleGatM3 = Math.max(0.002, (Math.PI * r * r - side * side) * h);
      vNettoM3 = singleGatM3 * palen;
      vBrutoM3 = vNettoM3 * (1 + Math.max(0, input.verlies) / 100);
      zakken25 = Math.ceil(vBrutoM3 / BETON_PRESETS_NL.bagYieldM3 - 1e-9);
    } else {
      zakken25 = Math.ceil(palen * Math.max(0, input.zakkenPerPaal) - 1e-9);
      vNettoM3 = zakken25 * BETON_PRESETS_NL.bagYieldM3;
      vBrutoM3 = vNettoM3;
    }
    areaM2 = 0;
  } else {
    vNettoM3 = areaM2 * (Math.max(0, input.dikte) / 100);
    vBrutoM3 = vNettoM3 * (1 + Math.max(0, input.verlies) / 100);
    zakken25 = vBrutoM3 <= 0 ? 0 : Math.ceil(vBrutoM3 / BETON_PRESETS_NL.bagYieldM3 - 1e-9);
  }

  const weightKg = zakken25 * BETON_PRESETS_NL.bagWeightKg;
  const waterLiter = Number((zakken25 * BETON_PRESETS_NL.waterPerBagLiter).toFixed(1));
  const zakkenCostEur = Number((zakken25 * input.zakPrijs).toFixed(2));
  const stortbetonEstEur = Number((vBrutoM3 * BETON_PRESETS_NL.stortbetonRefPerM3Eur).toFixed(2));
  const stortbetonAlert =
    input.mode === 'vlak' && vBrutoM3 > BETON_PRESETS_NL.stortbetonThresholdM3;
  const aanhanger = calcAanhanger(weightKg, input.maxPayloadKg);

  return {
    mode: input.mode,
    areaM2,
    vNettoM3,
    vBrutoM3,
    zakken25,
    weightKg,
    waterLiter,
    zakkenCostEur,
    stortbetonEstEur,
    stortbetonAlert,
    aanhanger,
  };
}

/**
 * Zelf beton mengen in de klassieke 1:2:3 verhouding
 * (1 deel cement : 2 delen betonzand : 3 delen betongrind).
 */
export function calcBetonSelfMix123(volumeM3, options = {}) {
  const { lossPct = 0, maxPayloadKg = LOGISTICS.defaultMaxPayloadKg } = options;
  const mix = BETON_PRESETS_NL.selfMix123PerM3;
  const volumeNettoM3 = Math.max(0, Number.isFinite(volumeM3) ? volumeM3 : 0);
  const volumeBrutoM3 = Number((volumeNettoM3 * (1 + Math.max(0, lossPct) / 100)).toFixed(4));

  const cementKg = Math.round(volumeBrutoM3 * mix.cementKg);
  const cementBags25 = cementKg <= 0 ? 0 : Math.ceil(cementKg / mix.cementBagWeightKg - 1e-9);
  const betonzandM3 = Number((volumeBrutoM3 * mix.betonzandM3).toFixed(3));
  const betonzandKg = Math.round(volumeBrutoM3 * mix.betonzandKg);
  const betongrindM3 = Number((volumeBrutoM3 * mix.betongrindM3).toFixed(3));
  const betongrindKg = Math.round(volumeBrutoM3 * mix.betongrindKg);
  const waterLiter = Math.round(volumeBrutoM3 * mix.waterLiter);
  const totalDryWeightKg = cementKg + betonzandKg + betongrindKg;
  const totalWetWeightKg = totalDryWeightKg + waterLiter;
  const aanhanger = calcAanhanger(totalDryWeightKg, maxPayloadKg);

  return {
    ratioVolume: mix.ratioVolume,
    volumeNettoM3,
    volumeBrutoM3,
    cementKg,
    cementBags25,
    betonzandM3,
    betonzandKg,
    betongrindM3,
    betongrindKg,
    waterLiter,
    totalDryWeightKg,
    totalWetWeightKg,
    aanhanger,
  };
}

// ==========================================
// 2. GRIND & SPLIT BEREKENEN
// ==========================================

export const DEFAULT_GRIND_INPUT = Object.freeze({
  lengte: 8,
  breedte: 3.5,
  dikte: 7,
  materiaal: 'basalt_split',
  extra: 8,
  grindmatten: true,
  zakPrijs: AGGREGATES_NL.grindPricing.bag25KgEur,
  bigBag10Eur: AGGREGATES_NL.grindPricing.bigBag10Eur,
  maxPayloadKg: LOGISTICS.defaultMaxPayloadKg,
});

export function calcGrind(raw = {}) {
  const mat =
    AGGREGATES_NL.grindMaterials.find((m) => m.id === (raw.materiaal ?? DEFAULT_GRIND_INPUT.materiaal)) ??
    AGGREGATES_NL.grindMaterials[0];
  const defaultExtra = raw.extra !== undefined ? raw.extra : mat.defaultExtraPct;
  const input = { ...DEFAULT_GRIND_INPUT, ...raw, extra: defaultExtra };

  const areaM2 = Math.max(0, input.lengte) * Math.max(0, input.breedte);
  const vNettoM3 = areaM2 * (Math.max(0, input.dikte) / 100);
  const vBrutoM3 = vNettoM3 * (1 + Math.max(0, input.extra) / 100);
  const weightKg = vBrutoM3 * mat.densityKgM3;
  const zakken25 = weightKg <= 0 ? 0 : Math.ceil(weightKg / 25 - 1e-9);
  const zakkenCostEur = Number((zakken25 * input.zakPrijs).toFixed(2));

  const priceRatio = input.bigBag10Eur / AGGREGATES_NL.grindPricing.bigBag10Eur;
  const bigBags = calcBigBags(vBrutoM3, {
    bigBag10Eur: input.bigBag10Eur,
    bigBag07Eur: Math.round(AGGREGATES_NL.grindPricing.bigBag07Eur * priceRatio),
    bigBag05Eur: Math.round(AGGREGATES_NL.grindPricing.bigBag05Eur * priceRatio),
  });

  const savingsEur = Number((zakkenCostEur - bigBags.totalCostEur).toFixed(2));
  const worteldoekM2 = Number((areaM2 * LOGISTICS.worteldoekOverlapFactor).toFixed(2));
  const grindmattenCount =
    input.grindmatten && areaM2 > 0
      ? Math.ceil((areaM2 * LOGISTICS.grindmatLossFactor) / LOGISTICS.grindmatAreaM2 - 1e-9)
      : 0;
  const aanhanger = calcAanhanger(weightKg, input.maxPayloadKg);

  return {
    areaM2,
    vNettoM3,
    vBrutoM3,
    densityKgM3: mat.densityKgM3,
    materiaalId: mat.id,
    materiaalLabel: mat.shortLabel,
    weightKg,
    zakken25,
    zakkenCostEur,
    bigBags,
    savingsEur,
    worteldoekM2,
    grindmattenCount,
    aanhanger,
  };
}

// ==========================================
// 3. ZAND BEREKENEN (INCL. INKLINK)
// ==========================================

export const DEFAULT_ZAND_INPUT = Object.freeze({
  lengte: 5,
  breedte: 4,
  dikte: 15,
  zandsoort: 'straatzand',
  inklink: 15,
  zakPrijs: AGGREGATES_NL.zandPricing.bag25KgEur,
  bigBag10Eur: AGGREGATES_NL.zandPricing.bigBag10Eur,
  maxPayloadKg: LOGISTICS.defaultMaxPayloadKg,
});

export function calcZand(raw = {}) {
  const zand =
    AGGREGATES_NL.zandTypes.find((z) => z.id === (raw.zandsoort ?? DEFAULT_ZAND_INPUT.zandsoort)) ??
    AGGREGATES_NL.zandTypes[0];
  const defaultInklink = raw.inklink !== undefined ? raw.inklink : zand.defaultInklinkPct;
  const input = { ...DEFAULT_ZAND_INPUT, ...raw, inklink: defaultInklink };

  const areaM2 = Math.max(0, input.lengte) * Math.max(0, input.breedte);
  const vNettoM3 = areaM2 * (Math.max(0, input.dikte) / 100);
  const vBrutoM3 = vNettoM3 * (1 + Math.max(0, input.inklink) / 100);
  const weightKg = vBrutoM3 * zand.densityKgM3;
  const zakken25 = weightKg <= 0 ? 0 : Math.ceil(weightKg / 25 - 1e-9);
  const zakkenCostEur = Number((zakken25 * input.zakPrijs).toFixed(2));

  const priceRatio = input.bigBag10Eur / AGGREGATES_NL.zandPricing.bigBag10Eur;
  const bigBags = calcBigBags(vBrutoM3, {
    bigBag10Eur: input.bigBag10Eur,
    bigBag07Eur: Math.round(AGGREGATES_NL.zandPricing.bigBag07Eur * priceRatio),
    bigBag05Eur: Math.round(AGGREGATES_NL.zandPricing.bigBag05Eur * priceRatio),
  });

  const savingsEur = Number((zakkenCostEur - bigBags.totalCostEur).toFixed(2));
  const aanhanger = calcAanhanger(weightKg, input.maxPayloadKg);

  return {
    areaM2,
    vNettoM3,
    vBrutoM3,
    densityKgM3: zand.densityKgM3,
    zandId: zand.id,
    zandLabel: zand.shortLabel,
    weightKg,
    zakken25,
    zakkenCostEur,
    bigBags,
    savingsEur,
    aanhanger,
  };
}

// ==========================================
// 4. TUINTEGELS BEREKENEN (+ STRAATZANDBED)
// ==========================================

export const DEFAULT_TUINTEGELS_INPUT = Object.freeze({
  lengte: 6,
  breedte: 4,
  tegel: '60x60_beton_5cm',
  legverband: 'halfsteens',
  snijverlies: 10,
  zandbedDikte: 15,
  zandInklink: 15,
  maxPayloadKg: LOGISTICS.defaultMaxPayloadKg,
});

export function calcTuintegels(raw = {}) {
  const legverband = raw.legverband ?? DEFAULT_TUINTEGELS_INPUT.legverband;
  const pattern = TUINTEGELS_LOGISTICS_NL.patterns.find((p) => p.id === legverband);
  const resolvedLoss =
    raw.snijverlies !== undefined
      ? raw.snijverlies
      : (pattern?.defaultLossPct ?? DEFAULT_TUINTEGELS_INPUT.snijverlies);

  const input = { ...DEFAULT_TUINTEGELS_INPUT, ...raw, legverband, snijverlies: resolvedLoss };
  const tile =
    TUINTEGELS_LOGISTICS_NL.tiles.find((t) => t.id === input.tegel) ??
    TUINTEGELS_LOGISTICS_NL.tiles[0];

  const areaNettoM2 = Math.max(0, input.lengte) * Math.max(0, input.breedte);
  const areaBrutoM2 = areaNettoM2 * (1 + Math.max(0, input.snijverlies) / 100);
  const singleArea = tile.lengthM * tile.widthM;
  const tegelsCount = areaBrutoM2 <= 0 ? 0 : Math.ceil(areaBrutoM2 / singleArea - 1e-9);
  const tegelsWeightKg = Number((tegelsCount * tile.weightKg).toFixed(1));
  const aanhanger = calcAanhanger(tegelsWeightKg, input.maxPayloadKg);

  const zandNettoM3 = areaNettoM2 * (Math.max(0, input.zandbedDikte) / 100);
  const zandBrutoM3 = zandNettoM3 * (1 + Math.max(0, input.zandInklink) / 100);
  const zandWeightKg = Math.round(zandBrutoM3 * 1500);
  const zandBigBags = calcBigBags(zandBrutoM3, AGGREGATES_NL.zandPricing);
  const voegzandKg = Number((areaNettoM2 * tile.voegzandKgPerM2).toFixed(1));
  const opsluitbandenStuks =
    areaNettoM2 <= 0 ? 0 : Math.ceil(2 * (Math.max(0, input.lengte) + Math.max(0, input.breedte)));

  return {
    areaNettoM2,
    areaBrutoM2,
    tileId: tile.id,
    tileLabel: tile.shortLabel,
    tileWeightKg: tile.weightKg,
    tileThicknessCm: tile.thicknessCm,
    tileCategory: tile.category,
    tegelsCount,
    tegelsWeightKg,
    aanhanger,
    zandNettoM3,
    zandBrutoM3,
    zandWeightKg,
    zandBigBags,
    voegzandKg,
    opsluitbandenStuks,
  };
}
