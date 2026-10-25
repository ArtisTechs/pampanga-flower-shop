import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "../api/client";
import { createAdminUser, fetchAdminUsers, updateAdminUser } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { PasswordRules } from "../components/PasswordFeedback";
import { PasswordInput } from "../components/PasswordInput";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDialog, AdminPageHeader, AdminSegments, AdminUiIcon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminAccountRole, AdminUser, AdminUserRole } from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { validateContactNumber, validateEmail, validateName, validateNewPassword } from "../utils/validation";

type StatusFilter = "All" | "Active" | "Disabled";

// One choice in the form covers both the account role and a customer's tier.
type AccessLevel = "Customer" | "VIP" | "Admin";

const ACCESS_LABELS: Record<AccessLevel, string> = {
  Customer: "Customer",
  VIP: "VIP customer",
  Admin: "Admin"
};

const accessLevelOf = (user: Pick<AdminUser, "accountRole" | "role">): AccessLevel =>
  user.accountRole === "admin" ? "Admin" : user.role;

const accessFields = (level: AccessLevel): { accountRole: AdminAccountRole; role: AdminUserRole } =>
  level === "Admin" ? { accountRole: "admin", role: "Customer" } : { accountRole: "user", role: level };

const USERS_REFRESH_MS = 30_000;

// Same rule as the API's avatarInitials: first letter of the first and last names.
const initialsFrom = (user: AdminUser) =>
  [user.firstName, user.lastName]
    .map((name) => name.trim()[0]?.toUpperCase() ?? "")
    .join("");

interface AdminUsersPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminUsersPage = ({ account, onLogout, onToast }: AdminUsersPageProps) => {
  const usersData = useApiData(fetchAdminUsers, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  // "new" opens the create form.
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const users = useMemo(() => usersData.data ?? [], [usersData.data]);
  const { updateData: updateUsers } = usersData;

  // Customers edit their own names and photos; refresh quietly (no loading state) when the admin
  // comes back to the tab and every 30 seconds while it's visible.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      fetchAdminUsers().then((fresh) => updateUsers(() => fresh), () => undefined);
    };
    const intervalId = window.setInterval(refresh, USERS_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [updateUsers]);

  const counts: Record<StatusFilter, number> = {
    All: users.length,
    Active: users.filter((user) => user.status === "Active").length,
    Disabled: users.filter((user) => user.status === "Disabled").length
  };
  const adminCount = users.filter((user) => user.accountRole === "admin").length;
  const vipCount = users.filter((user) => user.accountRole === "user" && user.role === "VIP").length;

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) =>
      (statusFilter === "All" || user.status === statusFilter)
      && (normalizedSearch === ""
        || user.fullName.toLowerCase().includes(normalizedSearch)
        || user.email.toLowerCase().includes(normalizedSearch)
        || user.contactNumber.replace(/\s+/g, "").includes(normalizedSearch.replace(/\s+/g, "")))
    );
  }, [search, statusFilter, users]);

  const handleSaved = (saved: AdminUser, isNew: boolean) => {
    usersData.updateData((current) =>
      isNew ? [...current, saved] : current.map((user) => (user.id === saved.id ? saved : user))
    );
    setEditing(null);
    onToast(isNew ? `${saved.fullName}'s account was created.` : `${saved.fullName} was updated.`, "success");
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Users"
          subtitle={usersData.data
            ? `${counts.All - adminCount} customers · ${vipCount} VIP · ${adminCount} admins · ${counts.Disabled} disabled`
            : "Manage customer and admin accounts"}
          actions={
            <button type="button" className="admin-products-primary" onClick={() => setEditing("new")} disabled={!usersData.data}>
              <AdminUiIcon name="plus" />
              Add user
            </button>
          }
        />

        <section className="admin-products-toolbar admin-ui-toolbar-2" aria-label="Filter users">
          <label className="admin-products-search">
            <AdminUiIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or phone..."
              aria-label="Search users"
            />
          </label>
          <AdminSegments
            label="Filter by account status"
            options={["All", "Active", "Disabled"] as const}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={usersData.data ? counts : undefined}
          />
        </section>

        {!usersData.data ? (
          <LoadState error={usersData.error} onRetry={usersData.reload} />
        ) : visibleUsers.length === 0 ? (
          <div className="admin-products-empty" role="status">
            <h2>No users found</h2>
            <p>Try a different search or status.</p>
          </div>
        ) : (
          <section className="admin-ui-panel" aria-label="Users">
            <table className="admin-ui-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const access = accessLevelOf(user);
                  return (
                    <tr key={user.id} className={user.status === "Disabled" ? "is-muted" : ""}>
                      <td data-label="User">
                        <div className="admin-ui-person">
                          <span className="admin-ui-avatar" aria-hidden="true">
                            {user.avatarUrl
                              ? <img src={resolveImagePath(user.avatarUrl, 80)} alt="" loading="lazy" />
                              : initialsFrom(user)}
                          </span>
                          <div>
                            <strong>{user.fullName}{user.id === account.id ? " (you)" : ""}</strong>
                            <span className="admin-ui-muted">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Phone">{user.contactNumber || "—"}</td>
                      <td data-label="Access">
                        <span className={`admin-ui-badge ${access === "Admin" ? "status-ready" : access === "VIP" ? "status-vip" : "status-neutral"}`}>
                          {access === "VIP" ? "★ VIP" : ACCESS_LABELS[access]}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`admin-ui-badge ${user.status === "Active" ? "status-completed" : "status-neutral"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="admin-ui-row-action">
                        <button type="button" className="admin-ui-link-button" onClick={() => setEditing(user)} aria-label={`Edit ${user.fullName}`}>
                          <AdminUiIcon name="edit" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {editing ? (
        <UserFormDialog
          user={editing === "new" ? null : editing}
          isSelf={editing !== "new" && editing.id === account.id}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onToast={onToast}
        />
      ) : null}
    </AdminLayout>
  );
};

interface UserFormDialogProps {
  /** null creates a new account. */
  user: AdminUser | null;
  /** The signed-in admin can't change their own access or disable themselves. */
  isSelf: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser, isNew: boolean) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type FieldName = "firstName" | "lastName" | "email" | "contactNumber" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;
const FIELD_NAMES: FieldName[] = ["firstName", "lastName", "email", "contactNumber", "password"];

// Before anything is saved, the admin reviews a summary and confirms.
interface PendingChange {
  rows: Array<{ label: string; from?: string; to: string }>;
}

const UserFormDialog = ({ user, isSelf, onClose, onSaved, onToast }: UserFormDialogProps) => {
  const isNew = user === null;
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [contactNumber, setContactNumber] = useState(user?.contactNumber ?? "");
  const [password, setPassword] = useState("");
  const [access, setAccess] = useState<AccessLevel>(user ? accessLevelOf(user) : "Customer");
  const [isActive, setIsActive] = useState(user ? user.status === "Active" : true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clearError = (field: FieldName) => setErrors((current) => ({ ...current, [field]: undefined }));

  const values = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    contactNumber: contactNumber.trim()
  };
  const statusText = isActive ? "Active" : "Disabled";

  const handleReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      email: validateEmail(email),
      contactNumber: validateContactNumber(contactNumber),
      password: isNew ? validateNewPassword(password) : undefined
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (isNew) {
      setPending({
        rows: [
          { label: "Name", to: `${values.firstName} ${values.lastName}` },
          { label: "Email", to: values.email },
          { label: "Phone", to: values.contactNumber },
          { label: "Access", to: ACCESS_LABELS[access] },
          { label: "Starting password", to: "Set by you (they can change it in their profile)" }
        ]
      });
      return;
    }

    const changes: PendingChange["rows"] = [
      { label: "First name", from: user.firstName, to: values.firstName },
      { label: "Last name", from: user.lastName, to: values.lastName },
      { label: "Email", from: user.email, to: values.email },
      { label: "Phone", from: user.contactNumber, to: values.contactNumber },
      { label: "Access", from: ACCESS_LABELS[accessLevelOf(user)], to: ACCESS_LABELS[access] },
      { label: "Status", from: user.status, to: statusText }
    ].filter((row) => row.from !== row.to);
    if (changes.length === 0) {
      onToast("Nothing has changed.", "error");
      return;
    }
    setPending({ rows: changes });
  };

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const saved = isNew
        ? await createAdminUser({ ...values, password, ...accessFields(access) })
        : await updateAdminUser({ ...user, ...values, ...accessFields(access), status: statusText });
      onSaved(saved, isNew);
    } catch (error) {
      // Field problems (e.g. a taken email) go back to the form; anything else is a toast.
      const field = error instanceof ApiError ? error.field : undefined;
      if (field && FIELD_NAMES.includes(field as FieldName)) {
        setErrors({ [field]: errorMessage(error) });
        setPending(null);
      } else {
        onToast(errorMessage(error), "error");
      }
      setIsSaving(false);
    }
  };

  const isAdminAccess = access === "Admin";
  const confirmTitle = isNew
    ? `Create this ${isAdminAccess ? "admin" : "customer"} account?`
    : "Save these changes?";

  return (
    <AdminDialog
      title={pending ? confirmTitle : isNew ? "Add user" : "Edit user"}
      subtitle={pending ? "Please check before confirming." : user?.email ?? "Create a customer or admin account"}
      onClose={onClose}
      isBusy={isSaving}
      onSubmit={handleReview}
      size="narrow"
      footer={pending ? (
        <>
          <button type="button" className="admin-products-secondary" onClick={() => setPending(null)} disabled={isSaving}>Go back</button>
          <button type="button" className="admin-products-primary" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "Saving..." : isNew ? "Confirm & create" : "Confirm & save"}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="admin-products-primary">{isNew ? "Review & create" : "Review changes"}</button>
        </>
      )}
    >
      {pending ? (
        <div className="admin-ui-confirm">
          <dl className="admin-ui-confirm-list">
            {pending.rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  {row.from !== undefined ? <><s>{row.from || "—"}</s> <span aria-label="changes to">→</span> </> : null}
                  <strong>{row.to || "—"}</strong>
                </dd>
              </div>
            ))}
          </dl>
          {isAdminAccess && (isNew || (user && accessLevelOf(user) !== "Admin")) ? (
            <p className="admin-ui-confirm-warning">This person will be able to manage orders, products, users and site content.</p>
          ) : null}
          {!isNew && user && user.status === "Active" && !isActive ? (
            <p className="admin-ui-confirm-warning">They'll be signed out right away and won't be able to log in.</p>
          ) : null}
        </div>
      ) : (
        <div className="admin-product-fields">
          <div className="admin-product-field-row admin-ui-field-row-even">
            <label className="admin-product-field">
              <span className="admin-product-label">First name <em>*</em></span>
              <input className={errors.firstName ? "invalid" : ""} value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError("firstName"); }} maxLength={60} />
              {errors.firstName ? <span className="admin-product-error">{errors.firstName}</span> : null}
            </label>
            <label className="admin-product-field">
              <span className="admin-product-label">Last name <em>*</em></span>
              <input className={errors.lastName ? "invalid" : ""} value={lastName} onChange={(event) => { setLastName(event.target.value); clearError("lastName"); }} maxLength={60} />
              {errors.lastName ? <span className="admin-product-error">{errors.lastName}</span> : null}
            </label>
          </div>
          <div className="admin-product-field-row admin-ui-field-row-even">
            <label className="admin-product-field">
              <span className="admin-product-label">Email <em>*</em></span>
              <input type="email" className={errors.email ? "invalid" : ""} value={email} onChange={(event) => { setEmail(event.target.value); clearError("email"); }} />
              {errors.email ? <span className="admin-product-error">{errors.email}</span> : null}
            </label>
            <label className="admin-product-field">
              <span className="admin-product-label">Phone <em>*</em></span>
              <input type="tel" className={errors.contactNumber ? "invalid" : ""} value={contactNumber} onChange={(event) => { setContactNumber(event.target.value); clearError("contactNumber"); }} />
              {errors.contactNumber ? <span className="admin-product-error">{errors.contactNumber}</span> : null}
            </label>
          </div>
          {isNew ? (
            <label className="admin-product-field">
              <span className="admin-product-label">Starting password <em>*</em></span>
              <PasswordInput
                className={errors.password ? "invalid" : ""}
                value={password}
                onChange={(event) => { setPassword(event.target.value); clearError("password"); }}
                autoComplete="new-password"
              />
              {errors.password
                ? <span className="admin-product-error">{errors.password}</span>
                : <span className="admin-ui-password-rules"><PasswordRules password={password} /></span>}
            </label>
          ) : null}
          <label className="admin-product-field">
            <span className="admin-product-label">Access</span>
            <select value={access} onChange={(event) => setAccess(event.target.value as AccessLevel)} disabled={isSelf}>
              <option value="Customer">Customer</option>
              <option value="VIP">VIP customer</option>
              <option value="Admin">Admin</option>
            </select>
            {isSelf ? <span className="admin-ui-muted">You can't change your own access.</span> : null}
          </label>
          {isNew ? null : (
            <div className="admin-product-switches">
              <label className="admin-product-switch">
                <input type="checkbox" role="switch" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={isSelf} />
                <span className="admin-product-switch-track" aria-hidden="true" />
                <span>
                  <strong>Account active</strong>
                  <small>
                    {isSelf
                      ? "You can't disable your own account"
                      : isActive ? "Can log in" : "Is logged out and can't log in"}
                  </small>
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </AdminDialog>
  );
};
