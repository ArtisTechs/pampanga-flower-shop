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
    folder: process.env.CLOUDINARY_FOLDER ?? "pampanga-flower-shop/products",
    avatarFolder: process.env.CLOUDINARY_AVATAR_FOLDER ?? "pampanga-flower-shop/avatars",
    paymentQrFolder: process.env.CLOUDINARY_PAYMENT_QR_FOLDER ?? "pampanga-flower-shop/payment-qr",
    paymentProofFolder: process.env.CLOUDINARY_PAYMENT_PROOF_FOLDER ?? "pampanga-flower-shop/payment-proofs",
    builderPreviewFolder: process.env.CLOUDINARY_BUILDER_PREVIEW_FOLDER ?? "pampanga-flower-shop/catalog/customize-previews/generated"
  },
  // Optional: customizer preview images. Without the chosen provider's credentials, the customizer shows the
  // closest stock preview instead.
  imageGeneration: {
    provider: process.env.IMAGE_PROVIDER === "gemini" ? "gemini" : "cloudflare",
    // New images one customer may trigger per hour; cached selections don't count.
    generationsPerHour: Number(process.env.IMAGE_GENERATIONS_PER_HOUR ?? 20),
    // With GEMINI_API_KEY set, each new image is checked against the selection (flower counts, colors, wrap)
    // and regenerated if it doesn't match, up to this many tries in total.
    maxAttempts: Math.min(5, Math.max(1, Number(process.env.PREVIEW_MAX_ATTEMPTS ?? 3)))
  },
  cloudflareAi: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    apiToken: process.env.CLOUDFLARE_AI_TOKEN ?? "",
    // FLUX.2 [klein] follows flower counts and colors far better than FLUX.1 [schnell] at a similar cost.
    imageModel: process.env.CLOUDFLARE_IMAGE_MODEL ?? "@cf/black-forest-labs/flux-2-klein-4b",
    // FLUX.1 [schnell] only, 1-8; more steps look better but use more of the daily free allowance.
    steps: Number(process.env.CLOUDFLARE_IMAGE_STEPS ?? 8)
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    imageModel: process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image",
    // Checks generated bouquet previews (free tier). The "latest" alias survives Google retiring older versions.
    checkModel: process.env.GEMINI_CHECK_MODEL ?? "gemini-flash-latest",
    // Used when the check model is busy or rate-limited.
    checkFallbackModel: process.env.GEMINI_CHECK_FALLBACK_MODEL ?? "gemini-flash-lite-latest"
  },
  // Optional: OTP emails go through Brevo. Without a key, development logs codes to the console
  // and production answers 503.
  mail: {
    brevoApiKey: process.env.BREVO_API_KEY ?? "",
    fromEmail: process.env.MAIL_FROM_EMAIL ?? "",
    fromName: process.env.MAIL_FROM_NAME ?? "Pampanga Flower Shop"
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
