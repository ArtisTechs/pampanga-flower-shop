export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-brand">Pampanga Flower Shop</p>
        <p className="site-footer-copy">Fresh blooms for every moment.</p>
        <p className="site-footer-meta">© {currentYear} Pampanga Flower Shop. All rights reserved.</p>
      </div>
    </footer>
  );
}
