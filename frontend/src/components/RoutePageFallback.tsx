interface RoutePageFallbackProps {
  readonly label?: string
}

function RoutePageFallback({ label = 'page' }: RoutePageFallbackProps) {
  return (
    <div
      className="rounded-2xl border border-[#2979FF]/20 bg-white p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="sr-only">Loading {label}</p>
      <p className="inline-flex items-center gap-2 font-medium text-[#2979FF]">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-[#2979FF]/30 border-t-[#2979FF] motion-reduce:animate-none"
        />
        Loading…
      </p>
    </div>
  )
}

export default RoutePageFallback
