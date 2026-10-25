import { useEffect, useMemo, useState, type FormEvent } from "react";
import { errorMessage } from "../api/client";
import { fetchAdminUsers, updateAdminUser } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminDialog, AdminPageHeader, AdminSegments, AdminUiIcon } from "../components/admin/AdminUi";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminUser, AdminUserRole } from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { validateName } from "../utils/validation";

type StatusFilter = "All" | "Active" | "Disabled";

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
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
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
  const vipCount = users.filter((user) => user.role === "VIP").length;

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

  const handleSaved = (saved: AdminUser) => {
    usersData.updateData((current) => current.map((user) => (user.id === saved.id ? saved : user)));
    setEditingUser(null);
    onToast(`${saved.fullName} was updated.`, "success");
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-products-page">
        <AdminPageHeader
          title="Users"
          subtitle={usersData.data
            ? `${counts.All} customers · ${vipCount} VIP · ${counts.Disabled} disabled`
            : "Manage customer accounts"}
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
            <h2>No customers found</h2>
            <p>Try a different search or status.</p>
          </div>
        ) : (
          <section className="admin-ui-panel" aria-label="Customers">
            <table className="admin-ui-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className={user.status === "Disabled" ? "is-muted" : ""}>
                    <td data-label="Customer">
                      <div className="admin-ui-person">
                        <span className="admin-ui-avatar" aria-hidden="true">
                          {user.avatarUrl
                            ? <img src={resolveImagePath(user.avatarUrl, 80)} alt="" loading="lazy" />
                            : initialsFrom(user)}
                        </span>
                        <div>
                          <strong>{user.fullName}</strong>
                          <span className="admin-ui-muted">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Phone">{user.contactNumber || "—"}</td>
                    <td data-label="Tier">
                      <span className={`admin-ui-badge ${user.role === "VIP" ? "status-vip" : "status-neutral"}`}>
                        {user.role === "VIP" ? "★ VIP" : "Customer"}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`admin-ui-badge ${user.status === "Active" ? "status-completed" : "status-neutral"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="admin-ui-row-action">
                      <button type="button" className="admin-ui-link-button" onClick={() => setEditingUser(user)} aria-label={`Edit ${user.fullName}`}>
                        <AdminUiIcon name="edit" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {editingUser ? (
        <UserEditDialog user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleSaved} onToast={onToast} />
      ) : null}
    </AdminLayout>
  );
};

interface UserEditDialogProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type FieldErrors = Partial<Record<"firstName" | "lastName" | "email" | "contactNumber", string>>;

const UserEditDialog = ({ user, onClose, onSaved, onToast }: UserEditDialogProps) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [contactNumber, setContactNumber] = useState(user.contactNumber);
  const [role, setRole] = useState<AdminUserRole>(user.role);
  const [isActive, setIsActive] = useState(user.status === "Active");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const nextErrors: FieldErrors = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : "Enter a valid email address.",
      contactNumber: /^[0-9+()\s-]{7,32}$/.test(contactNumber.trim()) ? undefined : "Enter a valid phone number."
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      onSaved(await updateAdminUser({
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        role,
        status: isActive ? "Active" : "Disabled"
      }));
    } catch (error) {
      onToast(errorMessage(error), "error");
      setIsSaving(false);
    }
  };

  return (
    <AdminDialog
      title="Edit customer"
      subtitle={user.email}
      onClose={onClose}
      isBusy={isSaving}
      onSubmit={handleSubmit}
      size="narrow"
      footer={
        <>
          <button type="button" className="admin-products-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="admin-products-primary" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button>
        </>
      }
    >
      <div className="admin-product-fields">
        <div className="admin-product-field-row admin-ui-field-row-even">
          <label className="admin-product-field">
            <span className="admin-product-label">First name <em>*</em></span>
            <input className={errors.firstName ? "invalid" : ""} value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={60} />
            {errors.firstName ? <span className="admin-product-error">{errors.firstName}</span> : null}
          </label>
          <label className="admin-product-field">
            <span className="admin-product-label">Last name <em>*</em></span>
            <input className={errors.lastName ? "invalid" : ""} value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={60} />
            {errors.lastName ? <span className="admin-product-error">{errors.lastName}</span> : null}
          </label>
        </div>
        <div className="admin-product-field-row admin-ui-field-row-even">
          <label className="admin-product-field">
            <span className="admin-product-label">Email <em>*</em></span>
            <input type="email" className={errors.email ? "invalid" : ""} value={email} onChange={(event) => setEmail(event.target.value)} />
            {errors.email ? <span className="admin-product-error">{errors.email}</span> : null}
          </label>
          <label className="admin-product-field">
            <span className="admin-product-label">Phone <em>*</em></span>
            <input type="tel" className={errors.contactNumber ? "invalid" : ""} value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} />
            {errors.contactNumber ? <span className="admin-product-error">{errors.contactNumber}</span> : null}
          </label>
        </div>
        <label className="admin-product-field">
          <span className="admin-product-label">Tier</span>
          <select value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)}>
            <option value="Customer">Customer</option>
            <option value="VIP">VIP</option>
          </select>
        </label>
        <div className="admin-product-switches">
          <label className="admin-product-switch">
            <input type="checkbox" role="switch" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span className="admin-product-switch-track" aria-hidden="true" />
            <span>
              <strong>Account active</strong>
              <small>{isActive ? "Customer can log in and order" : "Customer is logged out and can't log in"}</small>
            </span>
          </label>
        </div>
      </div>
    </AdminDialog>
  );
};
