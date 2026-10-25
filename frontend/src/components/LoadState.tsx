import type { CSSProperties } from "react";

interface LoadStateProps {
  error: string | null;
  onRetry: () => void;
  className?: string;
}

interface LoadingBloomProps {
  label?: string;
}

// Animated flower used wherever the shop is waiting on data.
export const LoadingBloom = ({ label = "Gathering fresh blooms…" }: LoadingBloomProps) => (
  <div className="loading-bloom" role="status">
    <span className="loading-bloom-flower" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="loading-bloom-petal" style={{ "--petal-index": index } as CSSProperties} />
      ))}
      <span className="loading-bloom-center" />
    </span>
    <p>{label}</p>
  </div>
);

// Loading / error placeholder for API-backed sections.
export const LoadState = ({ error, onRetry, className = "" }: LoadStateProps) => (
  error ? (
    <div className={`load-state load-state-error ${className}`} role="alert">
      <span className="load-state-icon" aria-hidden="true">✿</span>
      <h2>Something went <em>wrong</em></h2>
      <p>{error}</p>
      <button type="button" className="load-state-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  ) : (
    <div className={`load-state ${className}`}>
      <LoadingBloom />
    </div>
  )
);
