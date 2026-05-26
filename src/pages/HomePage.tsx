import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { features, flowerTypeCards, occasionCards, reviews } from "../data/homeData";
import { siteImage } from "../data/imagePaths";

interface HomePageProps {
  isLoggedIn: boolean;
  onRequireLogin: () => boolean;
}

export const HomePage = ({ isLoggedIn, onRequireLogin }: HomePageProps) => {
  const navigate = useNavigate();

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
  }, []);

  const handleStartCustomization = () => {
    if (!onRequireLogin()) {
      return;
    }

    navigate("/customize");
  };

  return (
    <>
      <section id="home" className="hero">
        <div className="hero-container">
          <p className="cta-first"><span aria-hidden="true">❤</span> Handcrafted with love in Pampanga</p>
          <h1 className="hero-title">
            <span>Create Your</span>
            <em>Dream Bouquet</em>
          </h1>
          <p className="hero-subtitle">Mix flowers, choose wrappers, and design a bouquet made just for your loved ones.</p>
          <div className="hero-buttons">
            <button type="button" className="cta-primary" onClick={handleStartCustomization}>
              Start Customizing
            </button>
            <a href="#philosophy" className="cta-secondary">Why Pampanga<br />Flowershop?</a>
          </div>
          <div className="hero-perks" aria-label="Shop benefits">
            <p><span aria-hidden="true">💐</span> Premium Flowers</p>
            <p><span aria-hidden="true">🎀</span> Custom Wrapping</p>
            <p><span aria-hidden="true">✅</span> Pick up</p>
          </div>
        </div>
      </section>

      <section className="occasion-section reveal-on-scroll" id="occasions">
        <div className="title reveal-on-scroll">
          <h1>Bouquets for <em>Every Occasion</em></h1>
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
        <div className="fts-title-section reveal-on-scroll"><h1>Browse by Flower Type</h1></div>
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
          <h2 className="section-title reveal-on-scroll">Features</h2>
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
              <span>Flowers that feel</span>
              <em>like you.</em>
            </h2>
            <p>Design your perfect bouquet, pick it up fresh, and make every moment unforgettable.</p>
          </div>
        </div>
        <div className="philosophy-content">
          <h2 id="philosophy-title" className="reveal-on-scroll">Our Philosophy</h2>
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
          <h2 id="customization-title">How it works?</h2>
          <p className="customization-subtitle reveal-on-scroll">Three simple steps to your dream bouquet</p>
          <div className="customization-steps">
            <article
              className="customization-step reveal-on-scroll"
              style={{ "--reveal-delay": "0ms", "--reveal-x": "-14px", "--reveal-y": "24px" } as CSSProperties}
            >
              <div className="step-number">01</div>
              <div className="step-icon step-icon-flowers" aria-hidden="true">
                <span></span>
              </div>
              <p>Pick from roses, tulips, peonies, and more. Mix and match to your heart's content.</p>
            </article>
            <article
              className="customization-step reveal-on-scroll"
              style={{ "--reveal-delay": "110ms", "--reveal-y": "24px" } as CSSProperties}
            >
              <div className="step-number">02</div>
              <div className="step-icon step-icon-palette" aria-hidden="true">
                <span></span>
              </div>
              <p>Select your color palette, wrap style, ribbon, and add personal extras.</p>
            </article>
            <article
              className="customization-step reveal-on-scroll"
              style={{ "--reveal-delay": "220ms", "--reveal-x": "14px", "--reveal-y": "24px" } as CSSProperties}
            >
              <div className="step-number">03</div>
              <div className="step-icon step-icon-check" aria-hidden="true">
                <span></span>
              </div>
              <p>Pick up your handcrafted bouquet fresh and beautifully packaged at our store.</p>
            </article>
          </div>
          <button type="button" className="customization-cta reveal-on-scroll" onClick={handleStartCustomization}>
            {isLoggedIn ? "Start Customizing Now" : "Login to Start Customizing"}
          </button>
        </div>
      </section>

      <section className="pricing" id="reviews">
        <div className="container">
          <h2 className="section-title reveal-on-scroll">Loved by Customers</h2>
          <p className="reviews-subtitle reveal-on-scroll">Real stories from real flower lovers</p>
          <div className="reviews-grid">
            {reviews.map((review, index) => (
              <article
                key={review.id}
                className="review-card reveal-on-scroll"
                style={{
                  "--reveal-delay": `${index * 95}ms`,
                  "--reveal-y": "30px"
                } as CSSProperties}
              >
                <div className="review-stars" aria-label="5 out of 5 stars">{review.actionText}</div>
                <p className="review-quote">"{review.summary}"</p>
                <div className="review-author">
                  <span className="review-avatar" aria-hidden="true">{review.bullets[0]}</span>
                  <span>{review.name}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
