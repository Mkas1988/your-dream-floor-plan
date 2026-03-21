

# EG-Grundriss Korrektur: Wohn-Essraum "hinter Küche"

## Problem

Im aktuellen 3D-Modell liegt der Wohn-Essraum rechts unten. Laut deinem Grundriss liegt er aber **hinter der Kuche** (zur Gartenseite / Norden hin).

## Korrigierte Raumaufteilung

```text
  NORD (-Z) = Trennwand / Gartenseite ("hinten")
  ┌──────────────────────────────────────────────┐
  │                                              │
  │           WOHN-ESSRAUM                       │
  │      (hinter Küche, volle/große Breite)      │
  │                                              │
  ├──────────┬────┬──────────────────────────────┤
  │          │    │                               │
  │  KÜCHE   │ FL │       TREPPE                  │
  │ 2.34×4.02│ ur ├───────────────────────────────┤
  │          ├────┤                               │
  │          │ WC │       DIELE                    │
  │          │    │     (Wendeltreppe)             │
  └──────────┴────┴───────────────────────────────┘
  SÜD (+Z) = Eingang / Straßenseite ("vorne")
```

Der Wohn-Essraum erstreckt sich über die gesamte oder nahezu gesamte Breite des Hauses an der Nordseite (Garten/hinten), direkt hinter der Kuche.

## Umsetzung

### `constants.ts` -- Komplett-Rewrite

**Außenwande** (4):
- Nord (z=-4.0): Trennwand, KEINE Fenster
- Ost (x=+4.75): Fenster (Wohn-Essraum oben, Diele unten)
- Sud (z=+4.0): Haustu r
- West (x=-4.75): Fenster (Kuche)

**Innenwande:**
- Horizontale Trennwand ca. z = -0.5 bis -1.0: trennt Wohn-Essraum (Nord) von Kuche/Treppe/Diele (Sud)
- Vertikale Wand x = -2.05: trennt Kuche von Flur (nur in sudlicher Halfte)
- Vertikale Wand x = -0.67: trennt Flur/WC von Treppe/Diele
- Horizontale Wand: Flur/WC Trennung
- Horizontale Wand: Treppe/Diele Trennung

**Bodenfliesen & Labels:** Angepasst an neue Raumpositionen.

### Keine Anderungen an anderen Dateien
`Wall.tsx`, `Floor.tsx`, `Scene.tsx`, `FloorPlanEditor.tsx` rendern korrekt basierend auf `constants.ts`.

