import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

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

  handleClose = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <AlertDialog open={this.state.hasError}>
          <AlertDialogContent className="bg-black border-2 border-red-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 text-xl font-bold">
                ⚠️ Error Occurred
              </AlertDialogTitle>
              <AlertDialogDescription className="text-red-400 mt-4">
                <div className="space-y-3">
                  <p className="font-semibold text-red-500">Error Message:</p>
                  <pre className="whitespace-pre-wrap text-sm bg-red-950 border border-red-700 p-3 rounded text-red-300 overflow-auto max-h-40">
                    {String(this.state.error?.message)}
                  </pre>
                  {this.state.info?.componentStack && (
                    <>
                      <p className="font-semibold text-red-500 mt-4">Component Stack:</p>
                      <pre className="whitespace-pre-wrap text-xs bg-red-950 border border-red-700 p-3 rounded text-red-300 overflow-auto max-h-32">
                        {this.state.info.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={this.handleClose}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
