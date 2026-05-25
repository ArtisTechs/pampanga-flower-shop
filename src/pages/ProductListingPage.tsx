import { Link, useParams, useSearchParams } from "react-router-dom";
import { categories } from "../data/catalogData";
import { ProductCard } from "../components/ProductCard";
import type { ProductItem } from "../types/shop";

const toTitleCase = (value = "products") =>
  value
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const getFallbackTitle = (scope = "", id = "") => {
  const label = toTitleCase(id);

  if (scope === "flowers") {
    return `${label} Bouquets`;
  }

  if (scope === "category") {
    return `${label} Flowers`;
  }

  return label;
};

interface ProductListingPageProps {
  onAddToCart: (product: ProductItem, quantity: number) => boolean;
}

export const ProductListingPage = ({ onAddToCart }: ProductListingPageProps) => {
  const { scope, id } = useParams<{ scope: string; id: string }>();
  const [searchParams] = useSearchParams();
  const route = `/${scope}/${id}`;
  const category = categories.find((entry) => entry.route === route) ?? {
    id: id ?? "products",
    title: getFallbackTitle(scope, id),
    route,
    products: []
  };
  const activeFilter = searchParams.get("filter");

  const displayedProducts = activeFilter === "best-sellers"
    ? category.products.filter((product) => product.bestSeller)
    : activeFilter === "occasions" || activeFilter === "flowers"
      ? category.products.filter((product) => product.catalogFilters?.includes(activeFilter))
    : category.products;
  const filters = [
    { label: "Best Sellers", route: `${route}?filter=best-sellers`, isActive: activeFilter === "best-sellers" },
    { label: "Occasions", route: `${route}?filter=occasions`, isActive: activeFilter === "occasions" },
    { label: "Flowers", route: `${route}?filter=flowers`, isActive: activeFilter === "flowers" }
  ];
  const pageTitle = activeFilter
    ? `${category.title} ${filters.find((filter) => filter.route.endsWith(`filter=${activeFilter}`))?.label ?? ""}`
    : category.title;

  return (
    <section className="section page-shell product-listing-page">
      <div className="catalog-toolbar">
        <Link to="/" className="back-home-button">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M10 3 5 8l5 5" />
          </svg>
          Back to Home
        </Link>
        <nav className="sub-menu" aria-label="Catalog filters">
          {filters.map((filter) => (
            <Link
              key={filter.route}
              to={filter.route}
              className={filter.isActive ? "active" : ""}
              aria-current={filter.isActive ? "page" : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </div>
      <h1 className="product-listing-title">{pageTitle}</h1>
      <div className="grid product-grid">
        {displayedProducts.length > 0 ? (
          displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))
        ) : (
          <div className="catalog-empty-state" role="status">
            <h2>No products found</h2>
            <p>This section does not have matching products for the selected filter yet.</p>
          </div>
        )}
      </div>
    </section>
  );
};
