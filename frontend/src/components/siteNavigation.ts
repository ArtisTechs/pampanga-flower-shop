import type { NavItem } from "../types/shop";

// Home page anchor navigation (page sections, not data).
export const siteNavItems: NavItem[] = [
  { label: "Home", href: "#home" },
  {
    label: "Features",
    href: "#features",
    children: [
      { label: "Features", href: "#features" },
      { label: "Flower Types", href: "#flower-types" },
      { label: "Our Philosophy", href: "#philosophy" },
      { label: "Customer Reviews", href: "#reviews" }
    ]
  },
  { label: "Start Customizing", href: "#customization" }
];
