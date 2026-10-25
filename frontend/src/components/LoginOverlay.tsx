import { FormEvent, useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { NavLink } from "react-router";
import { ApiError, errorMessage } from "../api/client";
import { requestOtp } from "../api/shop";
import { PasswordMatch, PasswordRules } from "./PasswordFeedback";
import { PasswordInput } from "./PasswordInput";
import type { OtpPurpose, RegisterInput, ResetPasswordInput } from "../types/shop";
import {
  validateContactNumber,
  validateEmail,
  validateName,
  validateNewPassword,
  validateOtpCode,
  validatePasswordMatch
} from "../utils/validation";

interface LoginOverlayProps {
  shopName: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: RegisterInput) => Promise<void>;
  onResetPassword: (input: ResetPasswordInput) => Promise<void>;
  onToast: (message: string, tone: "success" | "error") => void;
}

type AuthMode = "signin" | "signup" | "reset";
type FieldName = "firstName" | "lastName" | "email" | "password" | "confirmPassword" | "contactNumber" | "code";
type FormErrors = Partial<Record<FieldName | "form", string>>;

const FIELD_NAMES: FieldName[] = ["firstName", "lastName", "email", "password", "confirmPassword", "contactNumber", "code"];
const RESEND_COOLDOWN_SECONDS = 60;

const TITLES: Record<AuthMode, string> = {
  signin: "Login",
  signup: "Create Account",
  reset: "Reset Password"
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface LoginFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: FieldName;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
}

// Input with its error (or hint) shown directly underneath.
const LoginField = ({ name, error, hint, action, ...inputProps }: LoginFieldProps) => {
  const messageId = `login-${name}-message`;
  const sharedProps = {
    name,
    "aria-label": inputProps.placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? messageId : undefined
  };

  return (
    <div className="login-field">
      <div className={action ? "login-field-row" : undefined}>
        {inputProps.type === "password"
          ? <PasswordInput {...sharedProps} {...inputProps} />
          : <input {...sharedProps} {...inputProps} />}
        {action}
      </div>
      {error ? (
        <p id={messageId} className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <div id={messageId} className="field-hint">{hint}</div>
      ) : null}
    </div>
  );
};

export const LoginOverlay = ({ shopName, onLogin, onRegister, onResetPassword, onToast }: LoginOverlayProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // A code only counts for the address it was sent to.
  const isCodeSent = codeSentTo !== null && codeSentTo === normalizeEmail(email);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [cooldown]);

  const updateField = (field: FieldName, setter: (value: string) => void) => (value: string) => {
    setter(value);
    setErrors((current) => (current[field] || current.form ? { ...current, [field]: undefined, form: undefined } : current));
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setCodeSentTo(null);
    setErrors({});
  };

  // Shows an API error under the input it names, otherwise under the submit button.
  const showApiError = (error: unknown) => {
    const field = error instanceof ApiError ? error.field : undefined;
    const message = errorMessage(error);
    setErrors(field && FIELD_NAMES.includes(field as FieldName) ? { [field]: message } : { form: message });
  };

  const hasErrors = (nextErrors: FormErrors) => {
    setErrors(nextErrors);
    return Object.values(nextErrors).some(Boolean);
  };

  const handleSendCode = async (purpose: OtpPurpose) => {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsSendingCode(true);
    setErrors({});
    try {
      await requestOtp(email.trim(), purpose);
      setCodeSentTo(normalizeEmail(email));
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSendingCode(false);
    }
  };

  const validateCodeField = () => (isCodeSent ? validateOtpCode(code) : "Send a code to your email first");

  const submit = async (action: () => Promise<void>, successMessage: string) => {
    setIsSubmitting(true);
    try {
      await action();
      onToast(successMessage, "success");
    } catch (error) {
      showApiError(error);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || isSendingCode) {
      return;
    }

    if (authMode === "signin") {
      if (hasErrors({ email: validateEmail(email), password: password ? undefined : "Password is required" })) {
        return;
      }
      await submit(() => onLogin(email.trim(), password), "Logged in successfully.");
      return;
    }

    if (authMode === "signup") {
      const nextErrors: FormErrors = {
        firstName: validateName(firstName, "First name"),
        lastName: validateName(lastName, "Last name"),
        email: validateEmail(email),
        code: validateEmail(email) ? undefined : validateCodeField(),
        contactNumber: validateContactNumber(contactNumber),
        password: validateNewPassword(password),
        confirmPassword: validatePasswordMatch(password, confirmPassword)
      };
      if (hasErrors(nextErrors)) {
        return;
      }
      await submit(
        () => onRegister({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          contactNumber: contactNumber.trim(),
          code: code.trim()
        }),
        "Account created successfully. Welcome!"
      );
      return;
    }

    // Reset: the first step only sends the code.
    if (!isCodeSent) {
      await handleSendCode("reset");
      return;
    }

    const nextErrors: FormErrors = {
      email: validateEmail(email),
      code: validateCodeField(),
      password: validateNewPassword(password),
      confirmPassword: validatePasswordMatch(password, confirmPassword)
    };
    if (hasErrors(nextErrors)) {
      return;
    }
    await submit(
      () => onResetPassword({ email: email.trim(), code: code.trim(), password }),
      "Password updated. You're now signed in."
    );
  };

  const sendCodeButton = (purpose: OtpPurpose) => (
    <button
      type="button"
      className="otp-send-btn"
      onClick={() => void handleSendCode(purpose)}
      disabled={isSendingCode || isSubmitting || (isCodeSent && cooldown > 0)}
    >
      {isSendingCode
        ? "Sending..."
        : isCodeSent
          ? cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"
          : "Send code"}
    </button>
  );

  const codeField = (
    <LoginField
      name="code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={code}
      onChange={(event) => updateField("code", setCode)(event.target.value.replace(/\D/g, ""))}
      placeholder="6-digit code"
      error={errors.code}
      hint={isCodeSent ? `We sent a code to ${email.trim()}. It expires in 10 minutes; check your spam folder too.` : undefined}
    />
  );

  const newPasswordFields = (
    <>
      <LoginField
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => updateField("password", setPassword)(event.target.value)}
        placeholder={authMode === "reset" ? "New Password" : "Password"}
        error={errors.password}
        hint={<PasswordRules password={password} />}
      />
      <LoginField
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => updateField("confirmPassword", setConfirmPassword)(event.target.value)}
        placeholder="Confirm Password"
        error={errors.confirmPassword}
        hint={confirmPassword ? <PasswordMatch password={password} confirmation={confirmPassword} /> : undefined}
      />
    </>
  );

  const submitLabel = isSubmitting || (authMode === "reset" && isSendingCode)
    ? "Please wait..."
    : authMode === "signin"
      ? "Sign in"
      : authMode === "signup"
        ? "Sign up"
        : isCodeSent ? "Reset password" : "Send code";

  return (
    <div className="login-overlay" role="dialog" aria-modal="true" aria-label={TITLES[authMode]}>
      <header className="login-topbar">
        <div className="login-topbar-inner">
          <NavLink to="/" className="logo">{shopName}</NavLink>
          <nav aria-label="Guest navigation">
            <ul className="nav-menu">
              <li><NavLink to="/#home" className="nav-link">Home</NavLink></li>
              <li><NavLink to="/#features" className="nav-link">Features</NavLink></li>
              <li><NavLink to="/#customization" className="nav-link">Start Customizing</NavLink></li>
            </ul>
          </nav>
          <div className="login-user-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </div>
        </div>
      </header>
      <div className="login-container">
        <div className="login-box">
          <h1>{TITLES[authMode]}</h1>
          {authMode === "reset" ? (
            <p className="login-intro">
              {isCodeSent
                ? "Enter the code from your email and choose a new password."
                : "Enter your account email and we'll send you a 6-digit code."}
            </p>
          ) : null}
          <form
            className={`login-form ${authMode === "signup" ? "signup-form" : ""}`}
            onSubmit={handleSubmit}
            noValidate
          >
            {authMode === "signup" ? (
              <>
                <div className="login-name-row">
                  <LoginField
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => updateField("firstName", setFirstName)(event.target.value)}
                    placeholder="First Name"
                    error={errors.firstName}
                  />
                  <LoginField
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => updateField("lastName", setLastName)(event.target.value)}
                    placeholder="Last Name"
                    error={errors.lastName}
                  />
                </div>
                <LoginField
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => updateField("email", setEmail)(event.target.value)}
                  placeholder="Email"
                  error={errors.email}
                  action={sendCodeButton("signup")}
                />
                {codeField}
                <LoginField
                  name="contactNumber"
                  type="tel"
                  autoComplete="tel"
                  value={contactNumber}
                  onChange={(event) => updateField("contactNumber", setContactNumber)(event.target.value)}
                  placeholder="Contact No."
                  error={errors.contactNumber}
                />
                {newPasswordFields}
              </>
            ) : authMode === "reset" ? (
              <>
                <LoginField
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => updateField("email", setEmail)(event.target.value)}
                  placeholder="Email"
                  error={errors.email}
                  action={isCodeSent ? sendCodeButton("reset") : undefined}
                />
                {isCodeSent ? (
                  <>
                    {codeField}
                    {newPasswordFields}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <LoginField
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => updateField("email", setEmail)(event.target.value)}
                  placeholder="Email"
                  error={errors.email}
                />
                <LoginField
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => updateField("password", setPassword)(event.target.value)}
                  placeholder="Password"
                  error={errors.password}
                />
                <button type="button" className="forgot-link" onClick={() => switchMode("reset")}>
                  Forgot your password?
                </button>
              </>
            )}
            <button type="submit" className="login-btn" disabled={isSubmitting || isSendingCode}>
              {submitLabel}
            </button>
            {errors.form ? <p className="field-error form-error" role="alert">{errors.form}</p> : null}
          </form>
          <div className="login-footer">
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => switchMode(authMode === "signin" ? "signup" : "signin")}
            >
              {authMode === "signin" ? "Create account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
