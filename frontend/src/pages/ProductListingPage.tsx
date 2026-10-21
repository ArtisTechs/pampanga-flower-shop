import { Link, useParams, useSearchParams } from "react-router";
import { ApiError } from "../api/client";
import { fetchListing } from "../api/shop";
import { LoadState } from "../components/LoadState";
import { ProductCard } from "../components/ProductCard";
import { useApiData } from "../hooks/useApiData";
import type { ProductItem } from "../types/shop";

interface ProductListingPageProps {
  onAddToCart: (product: ProductItem, quantity: number) => boolean;
}

export const ProductListingPage = ({ onAddToCart }: ProductListingPageProps) => {
  const { scope, id } = useParams<{ scope: string; id: string }>();
  const [searchParams] = useSearchParams();
  const route = `/${scope}/${id}`;
  // Title, filter tabs and products all come from the API (categories + catalog_collections).
  const listing = useApiData(async () => {
    try {
      return await fetchListing(route);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
        return null;
      }
      throw error;
    }
  }, [route]);
  const activeFilterId = searchParams.get("filter");
  const filters = (listing.data?.filters ?? []).map((filter) => ({
    ...filter,
    route: `${route}?filter=${filter.id}`,
    isActive: filter.id === activeFilterId
  }));
  const activeFilter = filters.find((filter) => filter.isActive);
  const products = listing.data?.products ?? [];
  const displayedProducts = activeFilter
    ? products.filter((product) => product.catalogFilters?.includes(activeFilter.id))
    : products;
  const pageTitle = listing.data
    ? [listing.data.title, activeFilter?.label].filter(Boolean).join(" ")
    : "";

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
              key={filter.id}
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
        {listing.isLoading || listing.error ? (
          <LoadState error={listing.error} onRetry={listing.reload} />
        ) : listing.data === null ? (
          <div className="catalog-empty-state" role="status">
            <h2>Page not found</h2>
            <p>This collection doesn't exist. Browse our occasions and flower types from the home page.</p>
          </div>
        ) : displayedProducts.length > 0 ? (
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
