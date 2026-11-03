import type { SiteContent } from "../types/shop";
import { publicAssetPath } from "../utils/assets";

interface SiteFooterProps {
  siteContent: SiteContent | null;
}

export function SiteFooter({ siteContent }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {siteContent ? (
        <div className="site-footer-inner">
          <p className="site-footer-brand"><img className="logo-mark" src={publicAssetPath("images/site/logo.png")} alt="" />{siteContent.shopName}</p>
          <p className="site-footer-copy">{siteContent.aboutText}</p>
          <p className="site-footer-copy">{siteContent.fullAddress} · {siteContent.operatingHours}</p>
          <p className="site-footer-meta">© {currentYear} {siteContent.shopName}. All rights reserved.</p>
        </div>
      ) : null}
    </footer>
  );
}
