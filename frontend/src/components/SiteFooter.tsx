import type { SiteContent } from "../types/shop";

interface SiteFooterProps {
  siteContent: SiteContent | null;
}

export function SiteFooter({ siteContent }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {siteContent ? (
        <div className="site-footer-inner">
          <p className="site-footer-brand">{siteContent.shopName}</p>
          <p className="site-footer-copy">{siteContent.aboutText}</p>
          <p className="site-footer-copy">{siteContent.fullAddress} · {siteContent.operatingHours}</p>
          <p className="site-footer-meta">© {currentYear} {siteContent.shopName}. All rights reserved.</p>
        </div>
      ) : null}
    </footer>
  );
}
