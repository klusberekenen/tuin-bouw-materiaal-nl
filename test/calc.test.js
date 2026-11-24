import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AGGREGATES_NL,
  BETON_PRESETS_NL,
  TUINTEGELS_LOGISTICS_NL,
  calcAanhanger,
  calcBigBags,
  calcBeton,
  calcBetonSelfMix123,
  calcGrind,
  calcZand,
  calcTuintegels,
  parseNlNumber,
  fmtNum,
  fmtInt,
  fmtTon,
  fmtEur,
} from '../src/index.js';

describe('Beton berekenen (NEN-EN 206, 25 kg zakken & 1:2:3)', () => {
  it('berekent exact 80 zakken van 25 kg voor 1 m³ netto (0% verlies)', () => {
    const res = calcBeton({ lengte: 5, breedte: 2, dikte: 10, verlies: 0 });
    assert.equal(res.areaM2, 10);
    assert.equal(Number(res.vNettoM3.toFixed(4)), 1);
    assert.equal(Number(res.vBrutoM3.toFixed(4)), 1);
    assert.equal(res.zakken25, 80);
    assert.equal(res.weightKg, 2000);
    assert.equal(res.waterLiter, 176);
    assert.equal(res.zakkenCostEur, 360);
    assert.equal(res.stortbetonAlert, true);
    assert.equal(res.aanhanger.ritten, 4);
    assert.equal(res.aanhanger.status, 'overbelading');
  });

  it('reproduceert standaard tuinhuisplaat 4×3 m × 12 cm (+5% verlies)', () => {
    const res = calcBeton();
    assert.equal(res.areaM2, 12);
    assert.equal(Number(res.vNettoM3.toFixed(4)), 1.44);
    assert.equal(Number(res.vBrutoM3.toFixed(4)), 1.512);
    assert.equal(res.zakken25, 121);
    assert.equal(res.weightKg, 3025);
    assert.equal(res.stortbetonAlert, true);
    assert.equal(res.aanhanger.ritten, 6);
  });

  it('triggert geen stortbeton-alert bij 0,75 m³ of minder', () => {
    const res = calcBeton({ lengte: 3, breedte: 2.5, dikte: 10, verlies: 0 });
    assert.equal(Number(res.vBrutoM3.toFixed(4)), 0.75);
    assert.equal(res.zakken25, 60);
    assert.equal(res.stortbetonAlert, false);
  });

  it('berekent snelbeton voor schuttingpalen (vuistregel en paalgat-geometrie)', () => {
    const vuistregel = calcBeton({ mode: 'palen', aantalPalen: 10, zakkenPerPaal: 2 });
    assert.equal(vuistregel.areaM2, 0);
    assert.equal(vuistregel.zakken25, 20);
    assert.equal(vuistregel.weightKg, 500);
    assert.equal(vuistregel.aanhanger.status, 'veilig');
    assert.equal(vuistregel.aanhanger.ritten, 1);

    const geom = calcBeton({
      mode: 'palen',
      palenMethode: 'geometrie',
      aantalPalen: 10,
      gatDiameterCm: 25,
      gatDiepteCm: 65,
      paalBreedteCm: 9,
      verlies: 5,
    });
    assert.ok(geom.vNettoM3 > 0.25 && geom.vNettoM3 < 0.28);
    assert.ok(geom.zakken25 >= 22 && geom.zakken25 <= 24);
    assert.equal(geom.stortbetonAlert, false);
  });

  it('berekent 1:2:3 zelf-mengen verhouding voor 1 m³ beton', () => {
    const mix = calcBetonSelfMix123(1);
    assert.equal(mix.ratioVolume, '1:2:3');
    assert.equal(mix.cementKg, 325);
    assert.equal(mix.cementBags25, 13);
    assert.equal(mix.betonzandM3, 0.48);
    assert.equal(mix.betonzandKg, 720);
    assert.equal(mix.betongrindM3, 0.72);
    assert.equal(mix.betongrindKg, 1152);
    assert.equal(mix.waterLiter, 175);
    assert.equal(mix.totalDryWeightKg, 2197);
    assert.equal(mix.totalWetWeightKg, 2372);
    assert.equal(mix.aanhanger.ritten, 4);
  });
});

describe('Grind & Split berekenen (CROW)', () => {
  it('berekent standaard basalt split oprit 8×3,5 m × 7 cm (+8%, grindmatten)', () => {
    const res = calcGrind();
    assert.equal(res.areaM2, 28);
    assert.equal(res.densityKgM3, 1600);
    assert.equal(Number(res.vNettoM3.toFixed(4)), 1.96);
    assert.equal(Number(res.vBrutoM3.toFixed(4)), 2.1168);
    assert.equal(Math.round(res.weightKg), 3387);
    assert.equal(res.zakken25, 136);
    assert.equal(res.bigBags.n10, 2);
    assert.equal(res.bigBags.n05, 1);
    assert.equal(res.bigBags.totalVolumeM3, 2.5);
    assert.ok(res.savingsEur > 0);
    assert.equal(res.worteldoekM2, 32.2);
    assert.equal(res.grindmattenCount, 31);
    assert.equal(res.aanhanger.ritten, 7);
  });

  it('past soortelijk gewicht aan voor lichtgewicht lava split (1.000 kg/m³)', () => {
    const res = calcGrind({
      lengte: 4,
      breedte: 2.5,
      dikte: 10,
      materiaal: 'lava_split',
      extra: 0,
      grindmatten: false,
    });
    assert.equal(res.densityKgM3, 1000);
    assert.equal(res.weightKg, 1000);
    assert.equal(res.zakken25, 40);
    assert.equal(res.grindmattenCount, 0);
    assert.equal(res.aanhanger.ritten, 2);
  });
});

describe('Zand berekenen (incl. inklink)', () => {
  it('berekent standaard straatzand terrasbed 5×4 m × 15 cm (+15% inklink)', () => {
    const res = calcZand();
    assert.equal(res.areaM2, 20);
    assert.equal(res.densityKgM3, 1500);
    assert.equal(Number(res.vNettoM3.toFixed(4)), 3);
    assert.equal(Number(res.vBrutoM3.toFixed(4)), 3.45);
    assert.equal(res.weightKg, 5175);
    assert.equal(res.zakken25, 207);
    assert.equal(res.bigBags.n10, 3);
    assert.equal(res.bigBags.n05, 1);
    assert.equal(res.bigBags.totalVolumeM3, 3.5);
    assert.ok(res.savingsEur > 0);
    assert.equal(res.aanhanger.ritten, 10);
  });

  it('gebruikt 5% inklink en 1.450 kg/m³ voor speelzand', () => {
    const res = calcZand({ lengte: 1.5, breedte: 1.5, dikte: 30, zandsoort: 'speelzand' });
    assert.equal(res.densityKgM3, 1450);
    assert.equal(Number(res.vNettoM3.toFixed(4)), 0.675);
    assert.equal(Number(res.vBrutoM3.toFixed(5)), 0.70875);
    assert.equal(res.zakken25, 42);
  });
});

describe('Tuintegels & klinkers berekenen (+ zandbed)', () => {
  it('berekent standaard 60×60 betontegels terras 6×4 m (halfsteens +10%, 15 cm zandbed)', () => {
    const res = calcTuintegels();
    assert.equal(res.areaNettoM2, 24);
    assert.equal(Number(res.areaBrutoM2.toFixed(2)), 26.4);
    assert.equal(res.tegelsCount, 74);
    assert.equal(res.tegelsWeightKg, 3108);
    assert.equal(res.aanhanger.ritten, 6);
    assert.equal(Number(res.zandNettoM3.toFixed(2)), 3.6);
    assert.equal(Number(res.zandBrutoM3.toFixed(2)), 4.14);
    assert.equal(res.zandWeightKg, 6210);
    assert.equal(res.voegzandKg, 36);
    assert.equal(res.opsluitbandenStuks, 20);
  });

  it('past standaard snijverlies aan op basis van legverband', () => {
    const recht = calcTuintegels({ lengte: 5, breedte: 4, legverband: 'recht' });
    const diagonaal = calcTuintegels({ lengte: 5, breedte: 4, legverband: 'diagonaal' });
    assert.equal(Number(recht.areaBrutoM2.toFixed(2)), 21);
    assert.equal(Number(diagonaal.areaBrutoM2.toFixed(2)), 22.4);
    assert.ok(diagonaal.tegelsCount > recht.tegelsCount);
  });

  it('berekent waaltjes 100 stuks/m² correct', () => {
    const res = calcTuintegels({
      lengte: 5,
      breedte: 2,
      tegel: 'waaltjes',
      legverband: 'recht',
      snijverlies: 0,
    });
    assert.equal(res.tegelsCount, 1000);
    assert.equal(res.tegelsWeightKg, 1550);
    assert.equal(res.voegzandKg, 40);
  });
});

describe('Logistiek (750 kg aanhanger & Big Bags) en NL-formatting', () => {
  it('classificeert kofferbak (<=350 kg), veilig (<=550 kg) en overbelading (>550 kg)', () => {
    const trunk = calcAanhanger(300);
    assert.equal(trunk.status, 'kofferbak');
    assert.equal(trunk.ritten, 1);

    const safe = calcAanhanger(550);
    assert.equal(safe.status, 'veilig');
    assert.equal(safe.ritten, 1);
    assert.equal(safe.loadPct, 100);

    const over = calcAanhanger(551);
    assert.equal(over.status, 'overbelading');
    assert.equal(over.ritten, 2);
  });

  it('optimaliseert Big Bag combinaties rond 0,5 / 0,7 / 1,0 m³ drempels', () => {
    const p = { bigBag10Eur: 100, bigBag07Eur: 80, bigBag05Eur: 60 };
    assert.deepEqual(calcBigBags(0.4, p).totalVolumeM3, 0.5);
    assert.deepEqual(calcBigBags(0.6, p).totalVolumeM3, 0.7);
    assert.deepEqual(calcBigBags(0.75, p).totalVolumeM3, 1.0);
    assert.deepEqual(calcBigBags(2.65, p), {
      n10: 2,
      n07: 1,
      n05: 0,
      totalBags: 3,
      totalVolumeM3: 2.7,
      totalCostEur: 280,
      label: '2× 1,0 m³ + 1× 0,7 m³ Big Bag',
      shortLabel: '2×1 m³ + 1×0,7 m³',
    });
  });

  it('formatteert en parst Nederlandse getallen met komma en punt', () => {
    assert.equal(parseNlNumber('1.250,50', 0), 1250.5);
    assert.equal(parseNlNumber('3,5', 0), 3.5);
    assert.equal(fmtNum(1250.5, 2), '1.250,50');
    assert.equal(fmtInt(3387), '3.387');
    assert.equal(fmtTon(2000), '2,00 ton');
    assert.equal(fmtEur(155, 2), '€ 155,00');
  });
});

describe('Dataset-integriteit (JSON + CSV)', () => {
  it('bevat bronvermelding, updated_at en reference_calculator in alle JSON-bestanden', () => {
    for (const ds of [AGGREGATES_NL, BETON_PRESETS_NL, TUINTEGELS_LOGISTICS_NL]) {
      assert.equal(ds.year, 2026);
      assert.ok(typeof ds.updated_at === 'string' && ds.updated_at.length >= 10);
      assert.ok(Array.isArray(ds.sources) && ds.sources.length >= 2);
      assert.ok(String(ds.reference_calculator).startsWith('https://klusberekenen.com'));
    }
  });

  it('houdt CSV-aantallen synchroon met de JSON-datasets', () => {
    const parseLines = (rel) =>
      readFileSync(new URL(rel, import.meta.url), 'utf8')
        .trim()
        .split('\n');

    const aggCsv = parseLines('../data/aggregates-nl-2026.csv');
    assert.equal(
      aggCsv.length - 1,
      AGGREGATES_NL.grindMaterials.length + AGGREGATES_NL.zandTypes.length
    );

    const betonCsv = parseLines('../data/beton-presets-nl.csv');
    assert.equal(betonCsv.length - 1, BETON_PRESETS_NL.thicknessPresets.length);

    const tilesCsv = parseLines('../data/tuintegels-nl.csv');
    assert.equal(tilesCsv.length - 1, TUINTEGELS_LOGISTICS_NL.tiles.length);
  });
});
