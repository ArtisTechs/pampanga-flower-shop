import { publicAssetPath } from "../utils/assets";

const IMAGE_ROOT = "images";

export const categoryImage = (group: "occasions" | "flower-types", filename: string) =>
  publicAssetPath(`${IMAGE_ROOT}/categories/${group}/${filename}`);

export const occasionProductImage = (category: string, filename: string) =>
  publicAssetPath(`${IMAGE_ROOT}/products/occasions/${category}/${filename}`);

export const flowerProductImage = (category: string, filename: string) =>
  publicAssetPath(`${IMAGE_ROOT}/products/flowers/${category}/${filename}`);

export const siteImage = (filename: string) => publicAssetPath(`${IMAGE_ROOT}/site/${filename}`);
