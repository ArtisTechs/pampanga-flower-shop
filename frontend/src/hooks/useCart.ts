import { useEffect, useState } from "react";
import type { CartItem, ProductItem } from "../types/shop";

// The orders API accepts 1-20 of each item.
export const MAX_ITEM_QUANTITY = 20;

const cartKey = (accountId: string) => `cart:${accountId}`;

/** Most of one item the cart allows: the API limit, or fewer when the shop has less in stock. */
export const maxQuantityOf = (item: Pick<ProductItem, "stock">) => Math.min(MAX_ITEM_QUANTITY, item.stock ?? MAX_ITEM_QUANTITY);

// Stock is only checked here, never taken: it's taken when the order is placed, and the API re-checks it then.
const clampQuantity = (quantity: number, item: Pick<ProductItem, "stock">) =>
  Math.min(Math.max(Math.floor(quantity), 1), Math.max(1, maxQuantityOf(item)));

const readCart = (accountId: string): CartItem[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(cartKey(accountId)) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((item): item is CartItem => (
        typeof item?.id === "string"
        && typeof item.name === "string"
        && typeof item.pricePhp === "number"
        && typeof item.quantity === "number"
      ))
      : [];
  } catch {
    return [];
  }
};

const writeCart = (accountId: string, items: CartItem[]) => {
  try {
    localStorage.setItem(cartKey(accountId), JSON.stringify(items));
  } catch {
    // Storage blocked: the cart lasts until the page is reloaded.
  }
};

// Cart kept per account in localStorage so it survives reloads and isn't shared between logins.
export const useCart = (accountId: string | null) => {
  const [cartOwner, setCartOwner] = useState<string | null>(accountId);
  const [items, setItems] = useState<CartItem[]>(() => (accountId ? readCart(accountId) : []));

  if (cartOwner !== accountId) {
    setCartOwner(accountId);
    setItems(accountId ? readCart(accountId) : []);
  }

  useEffect(() => {
    if (cartOwner) {
      writeCart(cartOwner, items);
    }
  }, [cartOwner, items]);

  const addItem = (product: ProductItem, quantity: number) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, stock: product.stock, quantity: clampQuantity(item.quantity + quantity, product) }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: clampQuantity(quantity, product) }];
    });
  };

  const setItemQuantity = (productId: string, quantity: number) => {
    setItems((currentItems) => currentItems.map((item) =>
      item.id === productId ? { ...item, quantity: clampQuantity(quantity, item) } : item
    ));
  };

  const removeItem = (productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  const clear = () => setItems([]);

  return { items, addItem, setItemQuantity, removeItem, clear };
};
