import { useState, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import {
  createPaymentMethod,
  deletePaymentMethod,
  fetchAdminPaymentMethods,
  updatePaymentMethod,
  uploadPaymentQr
} from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDialog, AdminPageHeader, AdminUiIcon as Icon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import { useObjectUrl } from "../hooks/useObjectUrl";
import type { Account, PaymentMethod, PaymentMethodInput, PaymentMethodKind } from "../types/shop";
import { IMAGE_UPLOAD_TYPES, validateImageFile } from "../utils/validation";

const PAYMENT_KINDS: PaymentMethodKind[] = ["E-wallet", "Bank"];

const toInput = ({ kind, provider, accountName, accountNumber, qrImageUrl, active }: PaymentMethod): PaymentMethodInput => ({
  kind,
  provider,
  accountName,
  accountNumber,
  qrImageUrl,
  active
});

interface AdminPaymentMethodsPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminPaymentMethodsPage = ({ account, onLogout, onToast }: AdminPaymentMethodsPageProps) => {
  const methods = useApiData(fetchAdminPaymentMethods, []);
  // null = closed, "new" = add form, otherwise the method being edited.
  const [editing, setEditing] = useState<PaymentMethod | "new" | null>(null);
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const activeCount = methods.data?.filter((method) => method.active).length ?? 0;

  const handleSaved = (saved: PaymentMethod, isNew: boolean) => {
    methods.updateData((current) =>
      isNew ? [...current, saved] : current.map((method) => (method.id === saved.id ? saved : method))
    );
    setEditing(null);
    onToast(`${saved.provider} was ${isNew ? "added" : "updated"}.`, "success");
  };

  const handleToggle = async (method: PaymentMethod) => {
    setBusyId(method.id);
    try {
      const saved = await updatePaymentMethod(method.id, { ...toInput(method), active: !method.active });
      methods.updateData((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
      onToast(`${saved.provider} is now ${saved.active ? "shown at" : "hidden from"} checkout.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    setBusyId(method.id);
    try {
      await deletePaymentMethod(method.id);
      methods.updateData((current) => current.filter((entry) => entry.id !== method.id));
      setDeleting(null);
      onToast(`${method.provider} was removed.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Payments"
          subtitle={methods.data
            ? `${methods.data.length} accounts · ${activeCount} shown at checkout`
            : "Bank and e-wallet accounts customers pay to"}
          actions={
            <button type="button" className="admin-products-primary" onClick={() => setEditing("new")} disabled={!methods.data}>
              <Icon name="plus" />
              Add account
            </button>
          }
        />

        {methods.data && activeCount === 0 ? (
          <p className="admin-payment-warning" role="status">
            No account is shown at checkout, so customers can't place orders. Add or show at least one.
          </p>
        ) : null}

        {!methods.data ? (
          <LoadState error={methods.error} onRetry={methods.reload} />
        ) : methods.data.length === 0 ? (
          <div className="admin-products-empty" role="status">
            <h2>No payment accounts yet</h2>
            <p>Add your GCash, Maya, or bank account so customers can pay at checkout.</p>
            <button type="button" className="admin-products-primary" onClick={() => setEditing("new")}>
              <Icon name="plus" />
              Add account
            </button>
          </div>
        ) : (
          <section className="admin-payment-grid" aria-label="Payment accounts">
            {methods.data.map((method) => (
              <article key={method.id} className={`admin-payment-card ${method.active ? "" : "is-hidden"}`}>
                <div className="admin-payment-card-qr">
                  {method.qrImageUrl ? <img src={method.qrImageUrl} alt={`${method.provider} QR code`} /> : <span>No QR code</span>}
                </div>
                <div className="admin-payment-card-body">
                  <p className="admin-product-category">
                    {method.kind}
                    {method.active ? null : " · Hidden"}
                  </p>
                  <h3>{method.provider}</h3>
                  <p>{method.accountName}</p>
                  <p className="admin-payment-card-number">{method.accountNumber}</p>
                </div>
                <div className="admin-product-actions">
                  <button type="button" className="edit" onClick={() => setEditing(method)} aria-label={`Edit ${method.provider}`}>
                    <Icon name="edit" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(method)}
                    disabled={busyId === method.id}
                    aria-label={`${method.active ? "Hide" : "Show"} ${method.provider} at checkout`}
                  >
                    <Icon name={method.active ? "eye-off" : "eye"} />
                    {method.active ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(method)}
                    disabled={busyId === method.id}
                    aria-label={`Delete ${method.provider}`}
                  >
                    <Icon name="close" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {editing ? (
        <PaymentMethodFormDialog
          method={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onToast={onToast}
        />
      ) : null}

      {deleting ? (
        <AdminDialog
          title={`Delete ${deleting.provider}?`}
          subtitle="Customers won't see this account at checkout anymore. Existing orders keep their payment details."
          onClose={() => setDeleting(null)}
          isBusy={busyId === deleting.id}
          size="narrow"
          footer={
            <>
              <button type="button" className="admin-products-secondary" onClick={() => setDeleting(null)} disabled={busyId === deleting.id}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-payment-reject-button"
                onClick={() => handleDelete(deleting)}
                disabled={busyId === deleting.id}
              >
                {busyId === deleting.id ? "Deleting..." : "Delete"}
              </button>
            </>
          }
        >
          <p className="admin-ui-muted">{deleting.accountName} · {deleting.accountNumber}</p>
        </AdminDialog>
      ) : null}
    </AdminLayout>
  );
};

interface PaymentMethodFormDialogProps {
  method: PaymentMethod | null;
  onClose: () => void;
  onSaved: (method: PaymentMethod, isNew: boolean) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type FieldErrors = Partial<Record<"qr" | "provider" | "accountName" | "accountNumber", string>>;

const PaymentMethodFormDialog = ({ method, onClose, onSaved, onToast }: PaymentMethodFormDialogProps) => {
  const [kind, setKind] = useState<PaymentMethodKind>(method?.kind ?? "E-wallet");
  const [provider, setProvider] = useState(method?.provider ?? "");
  const [accountName, setAccountName] = useState(method?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(method?.accountNumber ?? "");
  const [active, setActive] = useState(method?.active ?? true);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const filePreviewUrl = useObjectUrl(qrFile);
  const previewUrl = filePreviewUrl ?? (removeQr ? null : method?.qrImageUrl ?? null);

  const pickFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const problem = validateImageFile(file);
    setErrors((current) => ({ ...current, qr: problem }));
    if (!problem) {
      setQrFile(file);
      setRemoveQr(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const nextErrors: FieldErrors = {
      provider: provider.trim() ? undefined : "Enter the bank or e-wallet name.",
      accountName: accountName.trim() ? undefined : "Enter the account name.",
      accountNumber: /^[0-9A-Za-z+()\s.-]+$/.test(accountNumber.trim())
        ? undefined
        : "Enter the account or mobile number."
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      const qrImageUrl = qrFile ? await uploadPaymentQr(qrFile) : removeQr ? null : method?.qrImageUrl ?? null;
      const input: PaymentMethodInput = {
        kind,
        provider: provider.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        qrImageUrl,
        active
      };
      const saved = method ? await updatePaymentMethod(method.id, input) : await createPaymentMethod(input);
      onSaved(saved, !method);
    } catch (error) {
      onToast(errorMessage(error), "error");
      setIsSaving(false);
    }
  };

  return (
    <AdminDialog
      title={method ? "Edit payment account" : "Add payment account"}
      subtitle="Customers see this at checkout and pay to it before you prepare their order."
      onClose={onClose}
      isBusy={isSaving}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="admin-products-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : method ? "Save changes" : "Add account"}
          </button>
        </>
      }
    >
      <div className="admin-payment-form">
        <div className="admin-product-field">
          <span className="admin-product-label">QR code</span>
          <label className={`admin-product-dropzone admin-payment-qr-drop ${previewUrl ? "has-image" : ""} ${errors.qr ? "invalid" : ""}`}>
            <input
              type="file"
              accept={IMAGE_UPLOAD_TYPES.join(",")}
              onChange={(event) => {
                pickFile(event.target.files?.[0]);
                event.target.value = "";
              }}
              disabled={isSaving}
            />
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="QR code preview" />
                <span className="admin-product-dropzone-overlay">
                  <Icon name="upload" />
                  Change QR
                </span>
              </>
            ) : (
              <span className="admin-product-dropzone-empty">
                <Icon name="upload" />
                <strong>Upload QR code</strong>
                <small>JPG, PNG or WebP · up to 2 MB</small>
              </span>
            )}
          </label>
          {previewUrl ? (
            <button
              type="button"
              className="admin-ui-link-button"
              onClick={() => {
                setQrFile(null);
                setRemoveQr(true);
              }}
              disabled={isSaving}
            >
              Remove QR code
            </button>
          ) : null}
          {errors.qr ? <span className="admin-product-error">{errors.qr}</span> : null}
        </div>

        <div className="admin-product-fields">
          <div className="admin-product-field-row">
            <label className="admin-product-field">
              <span className="admin-product-label">Type <em>*</em></span>
              <select value={kind} onChange={(event) => setKind(event.target.value as PaymentMethodKind)}>
                {PAYMENT_KINDS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="admin-product-field">
              <span className="admin-product-label">{kind === "Bank" ? "Bank" : "E-wallet"} name <em>*</em></span>
              <input
                className={errors.provider ? "invalid" : ""}
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                maxLength={80}
                placeholder={kind === "Bank" ? "e.g. BDO" : "e.g. GCash"}
                aria-invalid={Boolean(errors.provider)}
              />
              {errors.provider ? <span className="admin-product-error">{errors.provider}</span> : null}
            </label>
          </div>

          <label className="admin-product-field">
            <span className="admin-product-label">Account name <em>*</em></span>
            <input
              className={errors.accountName ? "invalid" : ""}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              maxLength={120}
              placeholder="e.g. Juan Dela Cruz"
              aria-invalid={Boolean(errors.accountName)}
            />
            {errors.accountName ? <span className="admin-product-error">{errors.accountName}</span> : null}
          </label>

          <label className="admin-product-field">
            <span className="admin-product-label">{kind === "Bank" ? "Account number" : "Mobile number"} <em>*</em></span>
            <input
              className={errors.accountNumber ? "invalid" : ""}
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              maxLength={64}
              inputMode={kind === "Bank" ? "numeric" : "tel"}
              placeholder={kind === "Bank" ? "e.g. 0012 3456 7890" : "e.g. 0917 123 4567"}
              aria-invalid={Boolean(errors.accountNumber)}
            />
            {errors.accountNumber ? <span className="admin-product-error">{errors.accountNumber}</span> : null}
          </label>

          <label className="admin-payment-toggle">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Show at checkout
          </label>
        </div>
      </div>
    </AdminDialog>
  );
};
