import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const shortcuts = [
  { keys: "Klick", desc: "Eckpunkt setzen (Zeichenmodus)" },
  { keys: "Doppelklick", desc: "Polygon schließen" },
  { keys: "Rechtsklick", desc: "Punkt einfügen/löschen" },
  { keys: "Esc", desc: "Zeichnung abbrechen" },
  { keys: "Ctrl+Z", desc: "Rückgängig" },
  { keys: "Ctrl+Shift+Z", desc: "Wiederherstellen" },
  { keys: "Mausrad", desc: "Zoom" },
  { keys: "Mitteltaste / Alt+Klick", desc: "Ansicht verschieben" },
];

export const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-muted text-foreground transition-colors"
        title="Tastaturkürzel"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setIsOpen(false)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Tastaturkürzel</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-3">
                  <kbd className="px-2 py-0.5 rounded bg-muted text-foreground text-[11px] font-mono font-medium whitespace-nowrap">
                    {s.keys}
                  </kbd>
                  <span className="text-xs text-muted-foreground text-right">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
