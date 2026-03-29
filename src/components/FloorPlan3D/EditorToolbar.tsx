import { ArrowLeft, MousePointer, Pencil, Plus, Minus, Settings, Save, Loader2 } from "lucide-react";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

interface EditorToolbarProps {
  phase: "outline" | "rooms";
  mode: "select" | "draw";
  helpText: string;
  showSettings: boolean;
  saving?: boolean;
  planName?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onBack: () => void;
  onSetMode: (mode: "select" | "draw") => void;
  onClearDrawing: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleSettings: () => void;
  onSave?: () => void;
  onPlanNameChange?: (name: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const EditorToolbar = ({
  phase, mode, helpText, showSettings, saving, planName,
  canUndo, canRedo,
  onBack, onSetMode, onClearDrawing, onZoomIn, onZoomOut, onToggleSettings,
  onSave, onPlanNameChange, onUndo, onRedo,
}: EditorToolbarProps) => {
  return (
    <div className="p-3 border-b border-border flex items-center gap-3">
      <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors">
        <ArrowLeft className="w-4 h-4 text-foreground" />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-foreground">
            {phase === "outline" ? "Gebäudeform zeichnen" : "Räume zeichnen"}
          </h1>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {phase === "outline" ? "Schritt 1" : "Schritt 2"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{helpText}</p>
      </div>
      <div className="flex gap-1.5">
        {onUndo && (
          <>
            <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-lg hover:bg-muted text-foreground disabled:opacity-30" title="Rückgängig (Ctrl+Z)">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-lg hover:bg-muted text-foreground disabled:opacity-30" title="Wiederherstellen (Ctrl+Shift+Z)">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
            </button>
            <div className="w-px bg-border mx-1" />
          </>
        )}
        <button
          onClick={() => { onSetMode("select"); onClearDrawing(); }}
          className={`p-2 rounded-lg transition-colors ${mode === "select" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
          title="Auswählen"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSetMode("draw")}
          className={`p-2 rounded-lg transition-colors ${mode === "draw" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
          title="Zeichnen"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <div className="w-px bg-border mx-1" />
        <button onClick={onZoomIn} className="p-2 rounded-lg hover:bg-muted text-foreground"><Plus className="w-4 h-4" /></button>
        <button onClick={onZoomOut} className="p-2 rounded-lg hover:bg-muted text-foreground"><Minus className="w-4 h-4" /></button>
        <div className="w-px bg-border mx-1" />
        <button
          onClick={onToggleSettings}
          className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
        >
          <Settings className="w-4 h-4" />
        </button>
        <KeyboardShortcuts />
        {onSave && (
          <>
            <div className="w-px bg-border mx-1" />
            {onPlanNameChange && (
              <input
                value={planName || ""}
                onChange={(e) => onPlanNameChange(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-border bg-background text-foreground text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Name..."
              />
            )}
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Speichern
            </button>
          </>
        )}
      </div>
    </div>
  );
};
