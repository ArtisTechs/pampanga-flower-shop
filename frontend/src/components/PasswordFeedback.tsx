import { PASSWORD_RULES } from "../utils/validation";

interface PasswordRulesProps {
  password: string;
}

// Live checklist under a new-password input: each rule ticks as soon as the typed password meets it.
export const PasswordRules = ({ password }: PasswordRulesProps) => (
  <ul className="password-rules" aria-live="polite">
    {PASSWORD_RULES.map((rule) => {
      const isMet = rule.test(password);
      return (
        <li key={rule.label} className={isMet ? "is-met" : undefined}>
          <span aria-hidden="true">{isMet ? "✓" : "•"}</span>
          {rule.label}
          <span className="visually-hidden">{isMet ? " (done)" : " (missing)"}</span>
        </li>
      );
    })}
  </ul>
);

interface PasswordMatchProps {
  password: string;
  confirmation: string;
}

// Live note under the confirm input; render it only once something has been typed there.
export const PasswordMatch = ({ password, confirmation }: PasswordMatchProps) => {
  const isMatch = password === confirmation;
  return (
    <span className={`password-match ${isMatch ? "is-met" : "is-unmet"}`} aria-live="polite">
      {isMatch ? "✓ Passwords match" : "Passwords don't match yet"}
    </span>
  );
};
