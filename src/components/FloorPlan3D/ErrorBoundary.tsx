import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full w-full bg-muted/50">
            <div className="text-center p-8">
              <p className="text-lg font-medium text-foreground mb-2">
                3D-Ansicht konnte nicht geladen werden
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
