import { Fragment } from "react";

interface EmphasisTextProps {
  text: string;
  // Wrap the plain parts in <span> for headings whose CSS styles span/em as separate lines.
  wrapPlain?: boolean;
}

// Renders admin-editable heading text where *wrapped words* become the highlighted <em> part.
export const EmphasisText = ({ text, wrapPlain = false }: EmphasisTextProps) => (
  <>
    {text.split(/\*([^*]+)\*/).map((part, index) => {
      const trimmed = wrapPlain ? part.trim() : part;
      if (!trimmed) {
        return null;
      }
      if (index % 2 === 1) {
        return <em key={index}>{trimmed}</em>;
      }
      return wrapPlain ? <span key={index}>{trimmed}</span> : <Fragment key={index}>{trimmed}</Fragment>;
    })}
  </>
);
