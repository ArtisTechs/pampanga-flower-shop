interface LoadStateProps {
  error: string | null;
  onRetry: () => void;
  className?: string;
}

// Loading / error placeholder for API-backed sections.
export const LoadState = ({ error, onRetry, className = "" }: LoadStateProps) => (
  error ? (
    <div className={`catalog-empty-state ${className}`} role="alert">
      <h2>Something went wrong</h2>
      <p>{error}</p>
      <button type="button" className="back-home-button load-state-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  ) : (
    <div className={`catalog-empty-state ${className}`} role="status">
      <p>Loading…</p>
    </div>
  )
);
