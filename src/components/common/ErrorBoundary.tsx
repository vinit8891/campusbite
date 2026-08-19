"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

import { reportError } from "@/lib/errorReporting";

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  sectionName?: string;
  className?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError(error, {
      sectionName: this.props.sectionName,
      componentStack: errorInfo.componentStack ?? undefined,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV !== "production";
      const section = this.props.sectionName || "page";

      return (
        <div
          className={`flex min-h-[300px] w-full flex-col items-center justify-center rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm ${
            this.props.className || ""
          }`}
          role="alert"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Something went wrong
          </h2>

          <p className="mt-2 max-w-md text-sm text-gray-500">
            We encountered an unexpected error while rendering this {section}.
            Please try refreshing or returning home.
          </p>

          {isDev && this.state.error && (
            <details className="mt-4 max-w-xl text-left">
              <summary className="cursor-pointer text-xs font-semibold text-red-600 hover:underline">
                Error details (Development only)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-gray-900 p-4 text-xs font-mono text-red-300">
                {this.state.error.name}: {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.reset}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.assign("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
