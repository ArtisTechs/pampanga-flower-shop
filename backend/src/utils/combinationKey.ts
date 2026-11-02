import { createHash } from "node:crypto";

export interface CombinationSpec {
  flowers: Array<{ code: string; color: string; quantity: number }>;
  fillers: string[];
  palette: string;
}

// The shop's own combination photos show one wrapping: Korean paper with a satin ribbon, so wrap and ribbon
// aren't part of the key.
export const combinationKey = ({ flowers, fillers, palette }: CombinationSpec) => {
  const canonical = {
    flowers: flowers.map(({ code, color, quantity }) => `${code}:${color.toLowerCase()}:${quantity}`).sort(),
    fillers: [...fillers].sort(),
    palette
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
};
