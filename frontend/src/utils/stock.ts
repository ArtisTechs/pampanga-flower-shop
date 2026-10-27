// Stock shown to customers. Orders take stock only when placed (never for the cart); the API re-checks it then.

/** Units the customer may still pick; unlimited when the item isn't stock-limited. */
export const stockLimit = (stock: number | null | undefined) => (stock ?? Number.POSITIVE_INFINITY);

export const isSoldOut = (stock: number | null | undefined) => stock !== null && stock !== undefined && stock <= 0;

/** "24 stems left", "Sold out", or null when there's nothing to show. */
export const stockLabel = (stock: number | null | undefined, unit: string) => {
  if (stock === null || stock === undefined) {
    return null;
  }
  return stock <= 0 ? "Sold out" : `${stock} ${unit} left`;
};
