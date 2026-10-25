import { useState, type InputHTMLAttributes } from "react";

// Password input with an eye button that shows or hides what was typed.
export const PasswordInput = (props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input">
      <input {...props} type={isVisible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        disabled={props.disabled}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {isVisible ? null : <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
};
