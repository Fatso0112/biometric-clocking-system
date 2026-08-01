import { Component, type ErrorInfo, type ReactNode } from 'react';
import AppShell from './AppShell';
import Button from './Button';
import Card from './Card';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // The production monitoring integration can report this error without changing the fallback UI.
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppShell className="justify-center">
          <Card className="text-center">
            <div role="alert">
              <h1 className="text-2xl font-bold leading-tight">Something went wrong</h1>
              <Button className="mt-6" onClick={() => window.location.assign('/')}>
                BACK TO LOGIN
              </Button>
            </div>
          </Card>
        </AppShell>
      );
    }

    return this.props.children;
  }
}
