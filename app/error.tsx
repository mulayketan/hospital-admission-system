'use client'

/**
 * App Router error boundary — avoids Next falling back to broken Pages 500 / _document
 * when something throws during prerender in dev.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      {process.env.NODE_ENV === 'development' && error?.message ? (
        <p className="max-w-lg text-center text-sm text-red-700">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  )
}
