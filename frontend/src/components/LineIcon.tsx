import type { ReactNode } from "react";

interface LineIconProps {
  name: string;
}

const bag = (
  <>
    <path d="M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    <path d="m9.4 14.3 1.9 1.9 3.4-3.7" />
  </>
);

// Line icons for home page content, keyed by home_steps.icon and home_perks.id.
const paths: Record<string, ReactNode> = {
  flowers: (
    <>
      <path d="M7.5 4.5 9.6 7.4 12 3.5l2.4 3.9 2.1-2.9V9a4.5 4.5 0 0 1-9 0z" />
      <path d="M12 13.5V21" />
      <path d="M12 18c-2.6 0-4.3-1.6-4.8-3.8 2.7 0 4.3 1.4 4.8 3.8z" />
      <path d="M12 16.5c2.2 0 3.7-1.3 4.1-3.2-2.3 0-3.7 1.2-4.1 3.2z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2a1.7 1.7 0 0 1 1.3-2.9H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="7.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="7.2" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="11" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  check: bag,
  pickup: bag,
  premium: (
    <>
      <circle cx="8.5" cy="8.5" r="2.6" />
      <circle cx="15.5" cy="8.5" r="2.6" />
      <circle cx="12" cy="5.6" r="2.6" />
      <path d="M6.5 12.5h11L12.9 21h-1.8z" />
      <path d="M10 15.5h4" />
    </>
  ),
  wrapping: (
    <>
      <path d="M12 11c-1.8-3.6-6.6-5.2-7.6-2.8-.9 2.2 3 3.8 7.6 2.8z" />
      <path d="M12 11c1.8-3.6 6.6-5.2 7.6-2.8.9 2.2-3 3.8-7.6 2.8z" />
      <circle cx="12" cy="11" r="1.4" />
      <path d="m11 12.3-3 7.2 2.2-.9 1 2.1 1.4-7.4" />
      <path d="m13 12.3 3 7.2-2.2-.9-1 2.1" />
    </>
  )
};

export const hasLineIcon = (name: string) => name in paths;

export const LineIcon = ({ name }: LineIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {paths[name] ?? paths.flowers}
  </svg>
);
