export const publicAssetPath = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

// Product images are either public-folder paths (seeded) or Cloudinary URLs (uploaded by admins).
// Cloudinary images get automatic format/quality and a size cap, applied on Cloudinary's CDN.
export const resolveImagePath = (path: string, width = 900) => {
  if (!/^https:\/\//.test(path)) {
    return publicAssetPath(path);
  }
  if (!path.startsWith("https://res.cloudinary.com/") || !path.includes(CLOUDINARY_UPLOAD_SEGMENT)) {
    return path;
  }
  return path.replace(CLOUDINARY_UPLOAD_SEGMENT, `${CLOUDINARY_UPLOAD_SEGMENT}f_auto,q_auto,c_limit,w_${width}/`);
};

// Static page artwork in public/images/site (backgrounds, hero art); catalog images come from the API.
export const siteImage = (filename: string) => publicAssetPath(`images/site/${filename}`);
