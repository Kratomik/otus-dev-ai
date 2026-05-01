import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logClientErrorToSupabase } from '../lib/logClientError'

export interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly hasError: boolean
  readonly errorMessage: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, errorMessage: '' }

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, errorMessage: message }
  }

  public componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Always log locally for dev visibility.
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary', error, info)

    void logClientErrorToSupabase({
      error,
      componentStack: info.componentStack ?? undefined,
    })
  }

  private readonly handleReload = () => {
    window.location.reload()
  }

  private readonly handleGoHome = () => {
    window.location.assign('/#/calculator')
  }

  public render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen bg-[#F5F9F7] px-4 py-10 text-[#0D1B2A]">
        <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-[#2979FF]/20 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-[#0D1B2A]/75">
            We hit an unexpected error while rendering this screen. You can try reloading the page or going back home.
          </p>

          <div className="rounded-xl bg-[#F5F9F7] p-3">
            <p className="text-xs font-semibold text-[#0D1B2A]/70">Error</p>
            <p className="mt-1 break-words font-mono text-xs text-[#0D1B2A]">{this.state.errorMessage}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-[44px] flex-1 rounded-xl bg-[#2979FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E67E6] active:bg-[#1757BD] motion-reduce:transition-none"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="min-h-[44px] flex-1 rounded-xl border border-[#2979FF]/40 bg-[#2979FF]/10 px-4 py-2 text-sm font-semibold text-[#0D1B2A] transition-colors hover:bg-[#2979FF]/15 active:bg-[#2979FF]/20 motion-reduce:transition-none"
            >
              Go to calculator
            </button>
          </div>
        </div>
      </main>
    )
  }
}

