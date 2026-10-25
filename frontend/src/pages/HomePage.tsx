import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { fetchHome, fetchProducts } from "../api/shop";
import { EmphasisText } from "../components/EmphasisText";
import { FeaturedCarousel } from "../components/FeaturedCarousel";
import { FallingPetals } from "../components/FallingPetals";
import { hasLineIcon, LineIcon } from "../components/LineIcon";
import { LoadState } from "../components/LoadState";
import { useApiData } from "../hooks/useApiData";
import type { SiteContent } from "../types/shop";
import { siteImage } from "../utils/assets";

interface HomePageProps {
  isLoggedIn: boolean;
  onRequireLogin: () => boolean;
  siteContent: SiteContent | null;
  siteContentError: string | null;
  onRetrySiteContent: () => void;
}

export const HomePage = ({ isLoggedIn, onRequireLogin, siteContent, siteContentError, onRetrySiteContent }: HomePageProps) => {
  const navigate = useNavigate();
  const home = useApiData(fetchHome, []);
  const bestSellers = useApiData(() => fetchProducts({ collection: "best-sellers" }), []);
  const occasionCards = home.data?.occasionCards ?? [];
  const flowerTypeCards = home.data?.flowerTypeCards ?? [];
  const features = home.data?.features ?? [];
  const testimonials = home.data?.testimonials ?? [];
  const perks = home.data?.perks ?? [];
  const steps = home.data?.steps ?? [];
  const text = (key: keyof SiteContent) => siteContent?.[key] ?? "";

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));

    if (revealItems.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          } else {
            entry.target.classList.remove("is-revealed");
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
    // Re-observe once API content has rendered new cards.
  }, [home.data, bestSellers.data]);

  const handleStartCustomization = () => {
    if (!onRequireLogin()) {
      return;
    }

    navigate("/customize");
  };

  const backdrop = (
    <div
      className="home-backdrop"
      style={{ "--home-backdrop-image": `url("${siteImage("home-florals.svg")}")` } as CSSProperties}
      aria-hidden="true"
    />
  );

  // The page is all API content; until both parts arrive, show one loading or error state instead of empty sections.
  if (!siteContent || !home.data) {
    const retry = () => {
      if (!siteContent) {
        onRetrySiteContent();
      }
      if (!home.data) {
        home.reload();
      }
    };
    return (
      <div className="home-page">
        {backdrop}
        <LoadState
          error={siteContent ? home.error : siteContentError ?? home.error}
          onRetry={retry}
          className="home-load-state"
        />
      </div>
    );
  }

  return (
    <div className="home-page">
      {backdrop}
      <FallingPetals />
      <section id="home" className="hero">
        <div className="hero-container">
          <p className="cta-first">
            {text("heroTagline") ? <><span aria-hidden="true">❤</span> {text("heroTagline")}</> : null}
          </p>
          <h1 className="hero-title">
            <EmphasisText text={text("bannerTitle")} wrapPlain />
          </h1>
          <p className="hero-subtitle">{text("bannerSubtitle")}</p>
          <div className="hero-buttons">
            <button type="button" className="cta-primary" onClick={handleStartCustomization}>
              Start Customizing
            </button>
            <a href="#philosophy" className="cta-secondary">{text("heroSecondaryCta")}</a>
          </div>
          <div className="hero-perks" aria-label="Shop benefits">
            {perks.map((perk) => (
              <p key={perk.id} className="hero-perk">
                <span className="hero-perk-icon" aria-hidden="true">
                  {hasLineIcon(perk.id) ? <LineIcon name={perk.id} /> : perk.icon}
                </span>
                {perk.label}
              </p>
            ))}
          </div>
        </div>
      </section>

      {bestSellers.data && bestSellers.data.length > 0 ? (
        <section className="featured-section" id="best-sellers" aria-labelledby="featured-title">
          <div className="featured-heading reveal-on-scroll">
            <p className="featured-eyebrow">Loved in Pampanga</p>
            <h2 id="featured-title">Our <em>Best Sellers</em></h2>
            <Link to="/collection/best-sellers" className="featured-view-all">View all</Link>
          </div>
          <FeaturedCarousel
            products={bestSellers.data.slice(0, 8)}
            route="/collection/best-sellers"
            label="Best-selling bouquets"
          />
        </section>
      ) : null}

      <section className="occasion-section reveal-on-scroll" id="occasions">
        <div className="title reveal-on-scroll">
          <h2><EmphasisText text={text("occasionsHeading")} /></h2>
        </div>
        <div className="grid occasion-grid">
          {occasionCards.map((card, index) => (
            <Link
              to={card.route}
              key={card.id}
              className="card card-link occasion-card reveal-on-scroll"
              style={{
                "--reveal-delay": `${index * 70}ms`,
                "--reveal-x": index % 2 === 0 ? "-18px" : "18px",
                "--reveal-y": "26px"
              } as CSSProperties}
              aria-label={card.subtitle}
            >
              <img src={card.image} alt={card.subtitle} />
              <div className="tag">{card.title}</div>
              <div className="label">{card.subtitle}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="flower-type-section reveal-on-scroll" id="flower-types">
        <div className="fts-title-section reveal-on-scroll"><h2><EmphasisText text={text("flowerTypesHeading")} /></h2></div>
        <div className="fts-grid">
          {flowerTypeCards.map((card, index) => (
            <Link
              key={card.id}
              to={card.route}
              className="fts-card reveal-on-scroll"
              style={{
                "--reveal-delay": `${index * 80}ms`,
                "--reveal-x": index % 2 === 0 ? "-16px" : "16px",
                "--reveal-y": "24px"
              } as CSSProperties}
              aria-label={card.label}
            >
              <img src={card.image} className="fts-card-img" alt={card.label} />
              <div className="fts-card-tag">{card.name}</div>
              <div className="fts-card-label">{card.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title reveal-on-scroll"><EmphasisText text={text("featuresHeading")} /></h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <article
                key={feature.id}
                className="feature-card reveal-on-scroll"
                style={{
                  "--reveal-delay": `${index * 95}ms`,
                  "--reveal-y": "28px"
                } as CSSProperties}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="philosophy" className="philosophy-section" aria-labelledby="philosophy-title">
        <div
          className="philosophy-hero"
          style={{
            "--philosophy-hero-image": `url("${siteImage("philosophy.png")}")`
          } as CSSProperties}
        >
          <div className="philosophy-hero-copy reveal-on-scroll">
            <h2>
              <EmphasisText text={text("philosophyBannerTitle")} wrapPlain />
            </h2>
            <p>{text("philosophyBannerText")}</p>
          </div>
        </div>
        <div className="philosophy-content">
          <h2 id="philosophy-title" className="reveal-on-scroll"><EmphasisText text={text("philosophyHeading")} /></h2>
          <div className="philosophy-grid">
            {features.map((feature, index) => (
              <article
                key={feature.id}
                className="philosophy-card reveal-on-scroll"
                style={{
                  "--reveal-delay": `${index * 95}ms`,
                  "--reveal-x": index % 2 === 0 ? "-14px" : "14px",
                  "--reveal-y": "22px"
                } as CSSProperties}
              >
                <div className="philosophy-icon" aria-hidden="true">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="customization" className="customization-section reveal-on-scroll" aria-labelledby="customization-title">
        <div className="customization-content reveal-on-scroll">
          <h2 id="customization-title"><EmphasisText text={text("howItWorksHeading")} /></h2>
          <p className="customization-subtitle reveal-on-scroll">{text("howItWorksSubtitle")}</p>
          <div className="customization-steps">
            {steps.map((step, index) => (
              <article
                key={step.id}
                className="customization-step reveal-on-scroll"
                style={{
                  "--reveal-delay": `${index * 110}ms`,
                  "--reveal-x": index === 0 ? "-14px" : index === steps.length - 1 ? "14px" : "0px",
                  "--reveal-y": "24px"
                } as CSSProperties}
              >
                <div className="step-badge" aria-hidden="true">
                  <LineIcon name={step.icon} />
                  <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
          <button type="button" className="customization-cta reveal-on-scroll" onClick={handleStartCustomization}>
            {isLoggedIn ? "Start Customizing Now" : "Login to Start Customizing"}
          </button>
        </div>
      </section>

      <section className="pricing" id="reviews">
        <div className="container">
          <h2 className="section-title reveal-on-scroll"><EmphasisText text={text("reviewsHeading")} /></h2>
          <p className="reviews-subtitle reveal-on-scroll">{text("reviewsSubtitle")}</p>
          <div className="reviews-grid">
            {testimonials.map((review, index) => (
              <article
                key={review.id}
                className="review-card reveal-on-scroll"
                style={{
                  "--reveal-delay": `${index * 95}ms`,
                  "--reveal-y": "30px"
                } as CSSProperties}
              >
                <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</div>
                <p className="review-quote">"{review.quote}"</p>
                <div className="review-author">
                  <span className="review-avatar" aria-hidden="true">{review.name.charAt(0).toUpperCase()}</span>
                  <span>{review.name}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
