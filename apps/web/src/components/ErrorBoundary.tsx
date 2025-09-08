/**
 * Error Boundary
 * Global error handling for the application
 */

import React, { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">💥</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                Something went wrong. Please refresh the page to try again.
              </p>
              
              {this.state.error && (
                <details className="text-left text-sm text-gray-500 mb-4">
                  <summary className="cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded">
                    <div className="font-medium mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre className="text-xs overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}