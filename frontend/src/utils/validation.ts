// Mirrors backend/src/utils/validate.ts so forms catch mistakes before a request is sent.
// Each returns an error message, or undefined when the value is valid.

export const validateEmail = (value: string) => {
  const email = value.trim();
  if (!email) {
    return "Email is required";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : "Enter a valid email address";
};

// For passwords being set (sign-up, reset).
export const validateNewPassword = (value: string) => {
  if (!value) {
    return "Password is required";
  }
  if (value.length < 8 || value.length > 200) {
    return "Password must be 8-200 characters";
  }
  return /[a-z]/i.test(value) && /\d/.test(value)
    ? undefined
    : "Password must include at least one letter and one number";
};

export const validatePasswordMatch = (password: string, confirmation: string) => {
  if (!confirmation) {
    return "Please confirm your password";
  }
  return password === confirmation ? undefined : "Passwords do not match";
};

// First or last name; label is "First name" or "Last name".
export const validateName = (value: string, label: string) => {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    return `${label} is required`;
  }
  if (name.length > 60) {
    return `${label} must be at most 60 characters`;
  }
  return /^\p{L}[\p{L}\p{M} .'-]*$/u.test(name)
    ? undefined
    : `${label} can only contain letters, spaces, hyphens, apostrophes, and periods`;
};

export const validateContactNumber = (value: string) => {
  const contact = value.trim();
  if (!contact) {
    return "Contact number is required";
  }
  return /^[0-9+()\s-]{7,32}$/.test(contact) ? undefined : "Enter a valid contact number";
};

export const validateOtpCode = (value: string) =>
  /^\d{6}$/.test(value.trim()) ? undefined : "Enter the 6-digit code from your email";

export const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

// Uploads (screenshots, QR codes) accept the same files as the API: JPG, PNG, or WebP up to 2 MB.
export const validateImageFile = (file: File) => {
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  return file.size > MAX_IMAGE_UPLOAD_BYTES
    ? `This image is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 2 MB.`
    : undefined;
};
