import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-[#f85149] text-lg font-semibold">Something went wrong</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#00d4aa] hover:underline"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
