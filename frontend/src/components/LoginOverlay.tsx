import { FormEvent, useState } from "react";
import { NavLink } from "react-router";
import { errorMessage } from "../api/client";
import type { RegisterInput } from "../types/shop";

interface LoginOverlayProps {
  shopName: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: RegisterInput) => Promise<void>;
  onToast: (message: string, tone: "success" | "error") => void;
}

export const LoginOverlay = ({ shopName, onLogin, onRegister, onToast }: LoginOverlayProps) => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (authMode === "signup") {
      if (!fullName || !password || !confirmPassword || !email || !contactNumber) {
        onToast("Please complete all fields.", "error");
        return;
      }

      if (password !== confirmPassword) {
        onToast("Passwords do not match.", "error");
        return;
      }

      setIsSubmitting(true);
      try {
        await onRegister({ fullName: fullName.trim(), email: email.trim(), password, contactNumber: contactNumber.trim() });
        onToast("Account created successfully. Welcome!", "success");
      } catch (error) {
        onToast(errorMessage(error), "error");
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(email, password);
      onToast("Logged in successfully.", "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-overlay" role="dialog" aria-modal="true" aria-label="Login">
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
          <h1>{authMode === "signin" ? "Login" : "Create Account"}</h1>
          <form className={`login-form ${authMode === "signup" ? "signup-form" : ""}`} onSubmit={handleSubmit}>
            {authMode === "signup" ? (
              <>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter Full Name" required aria-label="Enter Full Name" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required aria-label="Password" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required aria-label="Confirm Password" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required aria-label="Email" />
                <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact No." required aria-label="Contact No." />
              </>
            ) : (
              <>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required aria-label="Email" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required aria-label="Password" />
                <a href="#" className="forgot-link">Forgot your password?</a>
              </>
            )}
            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : authMode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>
          <div className="login-footer">
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
            >
              {authMode === "signin" ? "Create account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
