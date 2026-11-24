# Changelog

Alle relevante wijzigingen aan `tuin-bouw-materiaal-nl` worden in dit bestand gedocumenteerd.

## [v2026.1.0] - 2026-11-24

### Toegevoegd

- Nul-afhankelijkheden ESM-rekenmodule (`src/index.js`) met volledige TypeScript-declaraties (`src/index.d.ts`) voor Node.js 18+:
  - `calcBeton` (betonvloeren, funderingen, snelbeton voor schuttingpalen via vuistregel en paalgat-geometrie, > 0,75 m³ stortbeton-grens) en `calcBetonSelfMix123` (1:2:3 zelf-mengen verhouding).
  - `calcGrind` (basalt split, Ardenner split, riviergrind, Carrara split, lava split, anti-worteldoek +15% en grindmatten 120×80 cm).
  - `calcZand` (straatzand, ophoogzand, speelzand, brekerzand inclusief CROW-inklink).
  - `calcTuintegels` (60×60, 80×80, 90×90, waaltjes, dikformaat, BKK klinkers incl. legverband-snijverlies, straatzandbed, voegzand en opsluitbanden).
  - `calcAanhanger` (750 kg ongeremde aanhanger / 550 kg netto laadvermogen volgens Rijksoverheid/RDW) en `calcBigBags` (0,5 / 0,7 / 1,0 m³ combinatieplanner).
- Open referentiedatasets (2026) in zowel JSON- als CSV-formaat (`data/`), onder CC BY 4.0.
- Volledige `node:test`-testsuite (`test/calc.test.js`) en GitHub Actions CI-workflow voor Node.js 20 en 22.
