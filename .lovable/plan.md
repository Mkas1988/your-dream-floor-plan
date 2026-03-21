

# Korrektur des EG-Grundrisses — Rechte DHH

## Problem

Die aktuelle 3D-Darstellung stimmt nicht mit dem Grundriss-Bild überein. Die Raumaufteilung, Wandpositionen und Proportionen sind falsch.

## Analyse des Grundrisses (aus dem Bild)

Das Gebäude ist 9,50m breit (Ost-West) × 8,00m tief (Nord-Süd). Die rechte Haushälfte hat folgende Raumaufteilung:

```text
  NORD (Trennwand / Party wall — oben im Plan)
  ┌─────────────┬───────────────────────────────┐
  │             │          Treppe /              │
  │   KÜCHE     │      Staircase area            │
  │  2.34×4.02  │         4.46 breit             │
  │             │                                │
  │             ├────┬──────────────────────────  │
  │             │    │                            │
  ├─────────────┤Flur│                            │
  │             │1.38│    WOHN-ESSRAUM            │
  │   DIELE     ├────┤   (großer Raum rechts)     │
  │  2.76×3.25  │ WC │    ~4.55m breit            │
  │  (Wendel-   │    │    ~6.175m tief            │
  │   treppe)   │    │                            │
  │             │    │                            │
  └─────────────┴────┴────────────────────────────┘
  SÜD (Eingang / Entry — unten im Plan)
```

## Hauptfehler im aktuellen Code

1. **Trennwand**: Muss oben (Nord, -Z) sein — ohne Fenster. Aktuell ist die fensterlose Wand fälschlich im Süden.
2. **Küche**: Muss oben-links sein (2,34m breit × 4,02m tief), nicht wie aktuell positioniert.
3. **Diele**: Unten-links mit Wendeltreppe (2,76m × 3,25m).
4. **Wohn-Essraum**: Großer Raum rechts, erstreckt sich über den Großteil der rechten Seite.
5. **Treppe**: Oben-rechts (gerade Treppe), nicht im aktuellen Bereich.
6. **Flur/WC**: Kleine Räume in der Mitte zwischen Diele und Wohn-Essraum.
7. **Fenster/Türen**: Fenster links (West, Küche), rechts (Ost, Wohn-Essraum), unten (Süd, Eingang). Keine Fenster oben (Trennwand).

## Plan

### Datei: `constants.ts` — Komplette Neukalibrierung

Alle Wandsegmente, Raumlabels und Bodenfliesen werden neu berechnet basierend auf den exakten Maßen aus dem Grundriss:

**Koordinatensystem** (zentriert, 1 Einheit = 1m):
- X: -4.75 (West) bis +4.75 (Ost)
- Z: -4.0 (Nord/Trennwand) bis +4.0 (Süd/Eingang)
- Wandstärke: 0.24m

**Schlüssel-Koordinaten** (aus dem Bild abgeleitet):
- Hauptvertikalwand (trennt Küche/Diele von Rest): X ≈ -2.05
- Sekundäre Vertikalwand (trennt Flur/WC von Wohn-Essraum): X ≈ -0.43
- Horizontalwand (trennt Küche von Diele): Z ≈ +0.38
- Horizontalwand Flur/WC-Trennung: abgeleitet aus Maßen

**Außenwände:**
- Nord (Z = -4.0): Trennwand, KEINE Fenster
- Ost (X = +4.75): Wohn-Essraum, MIT Fenster
- Süd (Z = +4.0): Eingang, MIT Tür
- West (X = -4.75): Küche-Fenster, MIT Fenster

**Innenwände:** Exakt nach Maßen positioniert für alle Raumtrennungen.

**Bodenfliesen:** Farblich unterschiedlich pro Raum (Fliesen für Küche/WC, Holz für Wohn-Essraum/Diele).

**Raumlabels:** Korrekt positioniert in der Mitte jedes Raums.

### Keine Änderungen nötig an:
- `types.ts`, `Floor.tsx`, `Scene.tsx`, `FloorPlanEditor.tsx`, `Wall.tsx`, `Sidebar.tsx` — diese Komponenten rendern bereits korrekt basierend auf den Daten aus `constants.ts`.

