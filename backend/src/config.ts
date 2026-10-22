const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Optional: product image uploads are disabled (503) until all three are set.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    folder: process.env.CLOUDINARY_FOLDER ?? "pampanga-flower-shop/products"
  },
  db: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    // TLS for hosted MySQL (e.g. Aiven). DB_SSL_CA is the CA certificate's PEM text; "\n" escapes are accepted
    // for hosts that only take single-line values. Without it, the system CAs are used.
    ssl: process.env.DB_SSL === "true"
      ? { ca: process.env.DB_SSL_CA?.replace(/\\n/g, "\n") || undefined, rejectUnauthorized: true }
      : undefined
  }
};
