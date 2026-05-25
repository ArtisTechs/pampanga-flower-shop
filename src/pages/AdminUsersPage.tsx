import { useMemo, useState } from "react";
import { AdminLayout } from "../components/admin/AdminLayout";
import type { MockAccount } from "../types/shop";

type UserStatus = "Active" | "Disabled";
type UserRole = "Customer" | "VIP";

interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  status: UserStatus;
  role: UserRole;
}

const mockUsersSeed: AdminUserItem[] = [
  { id: "u-001", fullName: "Zaab Roque", email: "zaab.roque@gmail.com", contactNumber: "09171234001", status: "Active", role: "Customer" },
  { id: "u-002", fullName: "Ralph Diaz", email: "ralph.diaz@gmail.com", contactNumber: "09171234002", status: "Active", role: "VIP" },
  { id: "u-003", fullName: "Liana Paule", email: "liana.paule@gmail.com", contactNumber: "09171234003", status: "Active", role: "Customer" },
  { id: "u-004", fullName: "Acy Cayanan", email: "acy.cayanan@gmail.com", contactNumber: "09171234004", status: "Disabled", role: "Customer" },
  { id: "u-005", fullName: "Angelica Mendoza", email: "angelica.mendoza@gmail.com", contactNumber: "09171234005", status: "Active", role: "VIP" },
  { id: "u-006", fullName: "Neithan Dela Cruz", email: "neithan.delacruz@gmail.com", contactNumber: "09171234006", status: "Active", role: "Customer" },
  { id: "u-007", fullName: "Reigner Vergara", email: "reigner.vergara@gmail.com", contactNumber: "09171234007", status: "Disabled", role: "Customer" },
  { id: "u-008", fullName: "Avril Aquino", email: "avril.aquino@gmail.com", contactNumber: "09171234008", status: "Active", role: "Customer" }
];

interface AdminUsersPageProps {
  account: MockAccount;
  onLogout: () => void;
}

export const AdminUsersPage = ({ account, onLogout }: AdminUsersPageProps) => {
  const [users, setUsers] = useState(mockUsersSeed);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | UserStatus>("All");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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

  const handleSaveUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get("fullName") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const nextContact = String(formData.get("contactNumber") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "Active") as UserStatus;
    const nextRole = String(formData.get("role") ?? "Customer") as UserRole;

    if (!nextName || !nextEmail || !nextContact) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === editingUser.id
          ? {
              ...user,
              fullName: nextName,
              email: nextEmail,
              contactNumber: nextContact,
              status: nextStatus,
              role: nextRole
            }
          : user
      )
    );
    setEditingUserId(null);
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
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "All" | UserStatus)} aria-label="Filter users by status">
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
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminLayout>
  );
};
