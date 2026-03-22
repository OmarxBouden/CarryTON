'use client';
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
          <p className="text-4xl mb-4">😵</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">An unexpected error occurred. Please try again.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-[#2AABEE] text-white rounded-full px-6 py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
