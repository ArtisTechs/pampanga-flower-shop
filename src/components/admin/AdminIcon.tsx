import type { AdminDashboardStat } from "../../types/shop";

interface AdminIconProps {
  icon:
    | AdminDashboardStat["icon"]
    | "dashboard"
    | "orders"
    | "builder"
    | "inventory"
    | "users"
    | "content"
    | "reports"
    | "back"
    | "menu";
}

export const AdminIcon = ({ icon }: AdminIconProps) => {
  if (icon === "menu") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </svg>
    );
  }

  if (icon === "back") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m15 5-7 7 7 7" />
      </svg>
    );
  }

  if (icon === "bag" || icon === "orders") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 8h10l1 12H6z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        <path d="M11 13h2" />
      </svg>
    );
  }

  if (icon === "peso") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 4h6.2a4.8 4.8 0 0 1 0 9.6H8" />
        <path d="M8 4v16" />
        <path d="M5 8h11" />
        <path d="M5 12h11" />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l4 2" />
      </svg>
    );
  }

  if (icon === "alert") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4 3.5 19h17z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </svg>
    );
  }

  if (icon === "builder") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="2.4" />
        <circle cx="15.5" cy="7.5" r="2" />
        <circle cx="12" cy="14" r="2.2" />
        <path d="M12 16v5" />
        <path d="M8 10.2 12 21l3.5-11.5" />
      </svg>
    );
  }

  if (icon === "inventory") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m4 7 8-4 8 4-8 4z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </svg>
    );
  }

  if (icon === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (icon === "content") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16" />
        <path d="M12 4a12 12 0 0 1 0 16" />
        <path d="M12 4a12 12 0 0 0 0 16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M20 19H3" />
    </svg>
  );
};
