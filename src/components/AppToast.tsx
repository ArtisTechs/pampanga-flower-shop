export type ToastTone = "success" | "error";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
}

interface AppToastProps {
  toast: ToastMessage | null;
}

export const AppToast = ({ toast }: AppToastProps) => {
  if (!toast) {
    return null;
  }

  return (
    <div className={`app-toast app-toast-${toast.tone}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
};
