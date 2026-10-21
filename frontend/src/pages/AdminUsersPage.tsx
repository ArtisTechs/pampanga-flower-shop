import { useMemo, useState } from "react";
import { errorMessage } from "../api/client";
import { fetchAdminUsers, updateAdminUser } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { LoadState } from "../components/LoadState";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useApiData } from "../hooks/useApiData";
import type { Account, AdminUserRole, AdminUserStatus } from "../types/shop";


interface AdminUsersPageProps {
  account: Account;
  onLogout: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export const AdminUsersPage = ({ account, onLogout, onToast }: AdminUsersPageProps) => {
  const usersData = useApiData(fetchAdminUsers, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | AdminUserStatus>("All");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const users = useMemo(() => usersData.data ?? [], [usersData.data]);

  const editingUser = users.find((user) => user.id === editingUserId) ?? null;

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = normalizedSearch.length === 0
        || user.fullName.toLowerCase().includes(normalizedSearch)
        || user.email.toLowerCase().includes(normalizedSearch)
        || user.contactNumber.includes(normalizedSearch);
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, users]);

  const initialsFrom = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser || isSaving) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get("fullName") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextContact = String(formData.get("contactNumber") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "Active") as AdminUserStatus;
    const nextRole = String(formData.get("role") ?? "Customer") as AdminUserRole;

    if (!nextName || !nextEmail || !nextContact) {
      return;
    }

    setIsSaving(true);
    try {
      const savedUser = await updateAdminUser({
        ...editingUser,
        fullName: nextName,
        email: nextEmail,
        contactNumber: nextContact,
        status: nextStatus,
        role: nextRole
      });
      usersData.updateData((currentUsers) => currentUsers.map((user) => (user.id === savedUser.id ? savedUser : user)));
      setEditingUserId(null);
      onToast(`${savedUser.fullName} was updated.`, "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout account={account} onLogout={onLogout}>
      <div className="admin-page admin-users-page">
        <h1>Users</h1>

        <section className="admin-users-header-panel" aria-label="User list controls">
          <h2>User List</h2>
          <div className="admin-users-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or mobile..."
              aria-label="Search users"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | AdminUserStatus)} aria-label="Filter users by status">
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </section>

        <section className="admin-users-list-panel" aria-label="Users table">
          <div className="admin-users-list-head">
            <span>No.</span>
            <span>Profile</span>
            <span>Email</span>
            <span>Action</span>
          </div>

          <div className="admin-users-list-body">
            {!usersData.data ? <LoadState error={usersData.error} onRetry={usersData.reload} /> : null}
            {visibleUsers.map((user, index) => (
              <article key={user.id} className="admin-user-row">
                <span>{index + 1}</span>
                <div className="admin-user-profile">
                  <span className="admin-user-avatar">{initialsFrom(user.fullName)}</span>
                  <strong>{user.fullName}</strong>
                </div>
                <span>{user.email}</span>
                <button type="button" onClick={() => setEditingUserId(user.id)}>Edit</button>
              </article>
            ))}
          </div>
        </section>
      </div>

      {editingUser ? (
        <div className="admin-user-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-user-edit-title">
          <form className="admin-user-modal" onSubmit={handleSaveUser}>
            <h3 id="admin-user-edit-title">Edit User</h3>
            <label>
              Full Name
              <input name="fullName" defaultValue={editingUser.fullName} required />
            </label>
            <label>
              Email
              <input name="email" type="email" defaultValue={editingUser.email} required />
            </label>
            <label>
              Contact Number
              <input name="contactNumber" defaultValue={editingUser.contactNumber} required />
            </label>
            <label>
              Role
              <select name="role" defaultValue={editingUser.role}>
                <option value="Customer">Customer</option>
                <option value="VIP">VIP</option>
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={editingUser.status}>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </label>
            <div className="admin-user-modal-actions">
              <button type="button" onClick={() => setEditingUserId(null)}>Cancel</button>
              <button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminLayout>
  );
};
