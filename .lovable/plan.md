

# WizardStep2 komplett neu bauen — Zuverlässiger 2D-Raum-Editor

## Problem

Der aktuelle Editor ist kaputt:
1. **SVG-Canvas (700x700px) ist groeßer als der verfuegbare Platz (~556x540px)** — erzeugt Scrollbars, Koordinaten stimmen nicht
2. **Klick auf Canvas navigiert zurueck zur Startseite** — weil der Click-Handler in select-Mode `setSelectedRoomId(null)` ausfuehrt und nicht stoppt, was mit dem uebergroessen SVG zu Problemen fuehrt
3. **Kein Zoom/Pan** — bei groeßerem Canvas unmoeglich zu arbeiten

## Loesung: Kompletter Rewrite von WizardStep2.tsx

### Kernarchitektur

**Responsive SVG mit viewBox statt fester Pixel-Groesse:**
- SVG fuellt den verfuegbaren Container (`width="100%" height="100%"`)
- `viewBox` wird dynamisch berechnet basierend auf Zoom/Pan-State
- Mausrad = Zoom, mittlere Maustaste / Alt+Drag = Pan

**Robustes Koordinatensystem:**
- `screenToWorld(e)`: berechnet exakte Welt-Koordinaten ueber `svg.getScreenCTM().inverse()` — funktioniert unabhaengig von Container-Groesse
- Snap auf 0.25m-Raster (praxistauglicher als 0.1m)
- Grid passt sich dem Zoom-Level an

### Zeichenmodus (Punkt fuer Punkt)
- Klick setzt Eckpunkte
- Linie vom letzten Punkt zur Maus wird angezeigt
- Klick auf ersten Punkt (naehe-Check in Welt-Koordinaten, nicht Pixel) oder Doppelklick schließt Polygon
- ESC oder Abbrechen-Button verwirft
- Mindestens 3 Punkte fuer gueltige Form

### Bearbeitungsmodus
- **Punkte verschieben:** Vertex-Handles (Kreise) per Drag
- **Kante verschieben:** Kante anklicken + Drag verschiebt beide Endpunkte parallel
- **Raum verschieben:** Polygon-Flaeche per Drag
- **Punkt einfuegen:** Rechtsklick auf Kante fuegt Mittelpunkt ein
- **Punkt loeschen:** Rechtsklick auf Vertex loescht ihn (wenn >3 Punkte)

### Layout
- Kein fester Pixel-Canvas mehr — SVG fuellt `flex-1` Container
- Sidebar bleibt bei 320px (w-80)
- Toolbar oben mit Mode-Buttons

### Technische Details

**Zoom/Pan State:**
```text
viewCenter: [number, number]  // Welt-Koordinaten der Canvas-Mitte
zoom: number                  // Meter pro Viewport-Einheit (kleiner = naeher)
```

**viewBox Berechnung:**
```text
viewBox = `${center.x - w/2/zoom} ${center.y - h/2/zoom} ${w/zoom} ${h/zoom}`
```
wobei w/h die tatsaechliche Container-Groesse (via ResizeObserver) ist.

**Event-Handling:**
- `onWheel` → Zoom (mit Maus-Position als Fixpunkt)
- `onMouseDown` + `onMouseMove` + `onMouseUp` → Draw/Select/Pan
- `onContextMenu` → Punkt einfuegen/loeschen
- `onDoubleClick` → Polygon schließen

### Dateiaenderungen

Nur **eine Datei**: `src/components/FloorPlan3D/WizardStep2.tsx` — kompletter Rewrite (~450 Zeilen).

Keine Aenderungen an `types.ts`, `generatePlan.ts`, `FloorPlanEditor.tsx`, `Floor.tsx` oder anderen Dateien noetig.

