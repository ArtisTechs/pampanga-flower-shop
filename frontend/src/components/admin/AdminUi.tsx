import { useEffect, type FormEvent, type ReactNode } from "react";

// Shared building blocks for admin pages (header, segmented filter, dialog, icons), styled by the
// .admin-ui-* / .admin-product-dialog-* rules in global.css.

export type AdminUiIconName =
  | "plus"
  | "minus"
  | "search"
  | "edit"
  | "eye"
  | "eye-off"
  | "upload"
  | "close"
  | "arrow-right"
  | "phone"
  | "mail"
  | "calendar";

const iconPaths: Record<AdminUiIconName, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.5" /></>,
  "eye-off": <><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.4 7.6A17 17 0 0 0 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 4-.9" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "arrow-right": <path d="M5 12h14m-5-5 5 5-5 5" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>
};

export const AdminUiIcon = ({ name }: { name: AdminUiIconName }) => (
  <svg className="admin-products-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{iconPaths[name]}</svg>
);

interface AdminPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export const AdminPageHeader = ({ title, subtitle, actions }: AdminPageHeaderProps) => (
  <header className="admin-products-topbar">
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
    {actions ? <div className="admin-ui-header-actions">{actions}</div> : null}
  </header>
);

interface AdminSegmentsProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
}

export const AdminSegments = <T extends string>({ label, options, value, onChange, counts }: AdminSegmentsProps<T>) => (
  <div className="admin-products-segments" role="group" aria-label={label}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className={option === value ? "active" : ""}
        aria-pressed={option === value}
        onClick={() => onChange(option)}
      >
        {option}
        {counts?.[option] !== undefined ? <span>{counts[option]}</span> : null}
      </button>
    ))}
  </div>
);

interface AdminDialogProps {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  isBusy?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  footer?: ReactNode;
  size?: "default" | "narrow";
  children: ReactNode;
}

// Modal dialog (bottom sheet on phones). Esc and ✕ close it unless an action is in progress.
export const AdminDialog = ({ title, subtitle, onClose, isBusy = false, onSubmit, footer, size = "default", children }: AdminDialogProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose]);

  const content = (
    <>
      <header className="admin-product-dialog-header">
        <div>
          <h2 id="admin-dialog-title">{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button type="button" className="admin-product-dialog-close" onClick={onClose} disabled={isBusy} aria-label="Close">
          <AdminUiIcon name="close" />
        </button>
      </header>
      <div className="admin-ui-dialog-body">{children}</div>
      {footer ? <footer className="admin-product-dialog-footer">{footer}</footer> : null}
    </>
  );
  const className = `admin-product-dialog ${size === "narrow" ? "admin-ui-dialog-narrow" : ""}`;

  return (
    <div className="admin-product-dialog-backdrop">
      {onSubmit ? (
        <form className={className} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onSubmit={onSubmit} noValidate>
          {content}
        </form>
      ) : (
        <div className={className} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
          {content}
        </div>
      )}
    </div>
  );
};
