import React from 'react';

type State = { hasError: boolean; error?: Error; info?: React.ErrorInfo };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Captured error in ErrorBoundary:', error, info);
    this.setState({ hasError: true, error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">An error occurred</h2>
          <pre className="whitespace-pre-wrap text-sm text-red-700 bg-red-50 p-3 rounded">
            {String(this.state.error?.message)}
            {this.state.info?.componentStack && `\n\nComponent stack:\n${this.state.info.componentStack}`}
          </pre>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
