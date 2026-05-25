import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/shop";

interface SiteHeaderProps {
  items: NavItem[];
  showShadow: boolean;
  onLogout?: () => void;
  onLoginClick?: () => void;
  showLogout?: boolean;
  cartCount?: number;
  cartAnimationKey?: number;
}

export const SiteHeader = ({
  items,
  showShadow,
  onLogout,
  onLoginClick,
  showLogout = false,
  cartCount = 0,
  cartAnimationKey = 0
}: SiteHeaderProps) => {
  const [activeHash, setActiveHash] = useState(() => window.location.hash || "#home");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navMenuRef = useRef<HTMLUListElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hashItemsByHref = new Map(
      items
      .flatMap((item) => [item, ...(item.children ?? [])])
      .filter((item) => item.href.startsWith("#"))
      .map((item) => [item.href, item])
    );
    const hashItems = Array.from(hashItemsByHref.values());

    if (hashItems.length === 0) {
      return undefined;
    }

    const syncActiveSection = () => {
      const activationLine = 96;
      const sections = hashItems
        .map((item) => {
          const section = document.querySelector(item.href);
          if (!(section instanceof HTMLElement)) {
            return null;
          }
          const rect = section.getBoundingClientRect();
          return { href: item.href, top: rect.top, bottom: rect.bottom };
        })
        .filter((section): section is { href: string; top: number; bottom: number } => section !== null)
        .sort((a, b) => a.top - b.top);

      const sectionAtActivationLine = sections.find(
        (section) => section.top <= activationLine && section.bottom > activationLine
      );
      const latestPassedSection = [...sections]
        .reverse()
        .find((section) => section.top <= activationLine);
      const activeSection = sectionAtActivationLine ?? latestPassedSection ?? sections[0];

      if (activeSection) {
        setActiveHash(activeSection.href);
      }
    };

    syncActiveSection();

    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);
    window.addEventListener("hashchange", syncActiveSection);

    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, [items]);

  useEffect(() => {
    if (!openDropdown) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!navMenuRef.current?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className={`navbar ${showShadow ? "scrolled" : ""}`}>
      <div className="nav-container">
        <NavLink to="/" className="logo">Pampanga Flower Shop</NavLink>
        <ul className="nav-menu" ref={navMenuRef}>
          {items.map((item) => {
            const childItems = item.children ?? [];
            const hasChildren = childItems.length > 0;
            const activeChildItem = childItems.find((childItem) => childItem.href === activeHash);
            const isActive =
              activeHash === item.href || activeChildItem !== undefined;
            const displayLabel = activeChildItem?.label ?? item.label;

            return (
              <li key={item.label} className={hasChildren ? "nav-dropdown" : undefined}>
                {hasChildren ? (
                  <>
                    <button
                      type="button"
                      className={`nav-link nav-dropdown-trigger ${isActive ? "active" : ""}`}
                      aria-expanded={openDropdown === item.label}
                      aria-haspopup="true"
                      onClick={() => setOpenDropdown((current) => (current === item.label ? null : item.label))}
                    >
                      {displayLabel}
                      <span className="nav-dropdown-chevron" aria-hidden="true">▾</span>
                    </button>
                    <div className={`nav-dropdown-menu ${openDropdown === item.label ? "open" : ""}`}>
                      {childItems.map((childItem) => (
                        childItem.href.startsWith("#") ? (
                          <a
                            key={childItem.label}
                            href={childItem.href}
                            className={`nav-dropdown-link ${activeHash === childItem.href ? "active" : ""}`}
                            onClick={() => setOpenDropdown(null)}
                          >
                            {childItem.label}
                          </a>
                        ) : (
                          <NavLink
                            key={childItem.label}
                            to={childItem.href}
                            className="nav-dropdown-link"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {childItem.label}
                          </NavLink>
                        )
                      ))}
                    </div>
                  </>
                ) : item.href.startsWith("#") ? (
                  <a href={item.href} className={`nav-link ${isActive ? "active" : ""}`}>{item.label}</a>
                ) : (
                  <NavLink to={item.href} className="nav-link">{item.label}</NavLink>
                )}
              </li>
            );
          })}
        </ul>
        <NavLink
          to="/cart"
          className={({ isActive }) => `cart-link ${isActive ? "active" : ""} ${cartAnimationKey > 0 ? "cart-bump" : ""}`}
          aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          key={cartAnimationKey}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.5 7.5h13l-1.5 8h-10z" />
            <path d="M6.5 7.5 5.8 4H3.5" />
            <circle cx="9" cy="19" r="1.4" />
            <circle cx="17" cy="19" r="1.4" />
          </svg>
          {cartCount > 0 ? <span className="cart-count">{cartCount}</span> : null}
        </NavLink>
        <div className="user-profile" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (showLogout && onLogout) {
                setIsUserMenuOpen((isOpen) => !isOpen);
                return;
              }

              onLoginClick?.();
            }}
            className={`profile-menu-btn ${showLogout && onLogout ? "" : "login-profile-btn"}`}
            aria-label={showLogout && onLogout ? "Open user menu" : "Login"}
            aria-expanded={showLogout && onLogout ? isUserMenuOpen : undefined}
            aria-haspopup={showLogout && onLogout ? "menu" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.6-5 5-7.5 8-7.5S18.4 16 20 21" />
            </svg>
            {showLogout && onLogout ? null : <span>Login</span>}
          </button>
          {showLogout && onLogout && isUserMenuOpen ? (
              <div className="profile-menu" role="menu">
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                >
                  Logout
                </button>
              </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
};
