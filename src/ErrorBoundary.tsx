import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    info: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ info: errorInfo });
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{fontWeight: 'bold', fontSize: '18px'}}>UI Rendering Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px', background: '#fecaca', padding: '10px', borderRadius: '4px' }}>
            {this.state.error?.toString()}
            <br /><br />
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
