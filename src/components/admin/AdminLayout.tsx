import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MockAccount } from "../../types/shop";
import { AdminIcon } from "./AdminIcon";
import { adminNavItems } from "./adminNavigation";

interface AdminLayoutProps {
  account: MockAccount;
  children: ReactNode;
  onLogout: () => void;
}

export const AdminLayout = ({ account, children, onLogout }: AdminLayoutProps) => {
  const [isMenuHidden, setIsMenuHidden] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  return (
    <div className={`admin-shell ${isMenuHidden ? "admin-shell-menu-hidden" : ""}`}>
      <header className="admin-topbar">
        <div className="admin-topbar-start">
          <button
            type="button"
            className="admin-show-menu"
            onClick={() => setIsMenuHidden((currentValue) => !currentValue)}
            aria-label={isMenuHidden ? "Show admin menu" : "Hide admin menu"}
            aria-controls="admin-sidebar"
            aria-expanded={!isMenuHidden}
          >
            <AdminIcon icon="menu" />
          </button>
          <NavLink className="admin-brand" to="/admin/dashboard">Admin</NavLink>
        </div>
        <div className="admin-profile" ref={profileMenuRef}>
          <button
            type="button"
            className="admin-profile-trigger"
            onClick={() => setIsProfileMenuOpen((currentValue) => !currentValue)}
            aria-label="Open admin account menu"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
          >
            {account.fullName}
          </button>
          {isProfileMenuOpen && (
            <div className="admin-profile-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="admin-profile-menu-item"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="admin-sidebar" id="admin-sidebar" aria-label="Admin navigation">
        <button type="button" className="admin-hide-menu" onClick={() => setIsMenuHidden(true)}>
          <AdminIcon icon="back" />
          Hide menu
        </button>
        <nav>
          {adminNavItems.map((item) => (
            <NavLink
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              to={item.href}
              key={item.label}
            >
              <AdminIcon icon={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
};
