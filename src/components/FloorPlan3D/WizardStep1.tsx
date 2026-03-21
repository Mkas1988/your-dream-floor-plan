import { BuildingConfig } from "./types";
import { Building2 } from "lucide-react";

interface Props {
  config: BuildingConfig;
  onChange: (config: BuildingConfig) => void;
  onNext: () => void;
}

export const WizardStep1 = ({ config, onChange, onNext }: Props) => {
  const update = (key: keyof BuildingConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Grundriss erstellen</h1>
            <p className="text-sm text-muted-foreground">Schritt 1: Gebäudemaße</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Breite (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="30"
              value={config.width}
              onChange={(e) => update("width", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Tiefe (m)
            </label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="30"
              value={config.depth}
              onChange={(e) => update("depth", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Wandstärke (m)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="0.5"
                value={config.wallThickness}
                onChange={(e) => update("wallThickness", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Wandhöhe (m)
              </label>
              <input
                type="number"
                step="0.1"
                min="2"
                max="5"
                value={config.wallHeight}
                onChange={(e) => update("wallHeight", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-2">Vorschau</div>
            <div className="flex items-center justify-center">
              <div
                className="border-2 border-primary/40 bg-primary/5 rounded"
                style={{
                  width: `${Math.min(config.width * 20, 280)}px`,
                  height: `${Math.min(config.depth * 20, 200)}px`,
                }}
              >
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  {config.width}m × {config.depth}m
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={config.width < 3 || config.depth < 3}
          className="w-full mt-8 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Weiter → Räume erstellen
        </button>
      </div>
    </div>
  );
};
