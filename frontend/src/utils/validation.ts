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

export const validateFullName = (value: string) => {
  const name = value.trim();
  if (!name) {
    return "Full name is required";
  }
  return name.length > 120 ? "Full name must be at most 120 characters" : undefined;
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
