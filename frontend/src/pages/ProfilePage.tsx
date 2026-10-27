import { useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";
import { ApiError, errorMessage } from "../api/client";
import { changePassword, removeAvatar, updateProfile, uploadAvatar } from "../api/shop";
import type { ToastTone } from "../components/AppToast";
import { PasswordMatch, PasswordRules } from "../components/PasswordFeedback";
import { PasswordInput } from "../components/PasswordInput";
import type { Account } from "../types/shop";
import { resolveImagePath } from "../utils/assets";
import { validateContactNumber, validateName, validateNewPassword, validatePasswordMatch } from "../utils/validation";

interface ProfilePageProps {
  account: Account;
  onAccountUpdated: (account: Account) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

type Errors<Field extends string> = Partial<Record<Field | "form", string>>;

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

// Puts an API error under the input it names (when it's one of fields), otherwise under the form.
const apiErrors = <Field extends string>(error: unknown, fields: readonly Field[]): Errors<Field> => {
  const field = error instanceof ApiError ? error.field : undefined;
  return field && (fields as readonly string[]).includes(field)
    ? ({ [field]: errorMessage(error) } as Errors<Field>)
    : ({ form: errorMessage(error) } as Errors<Field>);
};

interface ProfileFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}

const ProfileField = ({ id, label, error, hint, ...inputProps }: ProfileFieldProps) => {
  const messageId = `${id}-message`;

  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      {inputProps.type === "password" ? (
        <PasswordInput
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...inputProps}
        />
      ) : (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...inputProps}
        />
      )}
      {error ? (
        <p id={messageId} className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <div id={messageId} className="field-hint">{hint}</div>
      ) : null}
    </div>
  );
};

const AvatarSection = ({ account, onAccountUpdated, onToast }: ProfilePageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!AVATAR_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("The photo must be 3 MB or smaller");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      onAccountUpdated(await uploadAvatar(file));
      onToast("Profile photo updated.", "success");
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    setError(null);
    try {
      onAccountUpdated(await removeAvatar());
      onToast("Profile photo removed.", "success");
    } catch (removeError) {
      setError(errorMessage(removeError));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="profile-card profile-photo-card" aria-labelledby="profile-photo-title">
      <div className="profile-avatar" aria-hidden="true">
        {account.avatarUrl
          ? <img src={resolveImagePath(account.avatarUrl, 240)} alt="" />
          : <span>{account.avatarInitials}</span>}
      </div>
      <div className="profile-photo-body">
        <h2 id="profile-photo-title">Profile Photo</h2>
        <p className="field-hint">JPG, PNG, or WebP, up to 3 MB.</p>
        <div className="profile-actions">
          <button type="button" className="proceed-button" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
            {isBusy ? "Please wait..." : account.avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {account.avatarUrl ? (
            <button type="button" className="back-home-button" onClick={handleRemove} disabled={isBusy}>
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_TYPES.join(",")}
          onChange={handleFile}
          hidden
        />
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </div>
    </section>
  );
};

const DETAIL_FIELDS = ["firstName", "lastName", "contactNumber"] as const;

const DetailsSection = ({ account, onAccountUpdated, onToast }: ProfilePageProps) => {
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [contactNumber, setContactNumber] = useState(account.contactNumber);
  const [errors, setErrors] = useState<Errors<(typeof DETAIL_FIELDS)[number]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isChanged = firstName.trim() !== account.firstName
    || lastName.trim() !== account.lastName
    || contactNumber.trim() !== account.contactNumber;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      contactNumber: validateContactNumber(contactNumber)
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNumber: contactNumber.trim()
      });
      onAccountUpdated(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setContactNumber(updated.contactNumber);
      onToast("Profile updated.", "success");
    } catch (error) {
      setErrors(apiErrors(error, DETAIL_FIELDS));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="profile-card" aria-labelledby="profile-details-title">
      <h2 id="profile-details-title">Personal Details</h2>
      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <div className="profile-field-row">
          <ProfileField
            id="profile-first-name"
            label="First name"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={errors.firstName}
          />
          <ProfileField
            id="profile-last-name"
            label="Last name"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={errors.lastName}
          />
        </div>
        <ProfileField
          id="profile-email"
          label="Email"
          type="email"
          value={account.email}
          readOnly
          hint="Your email can't be changed here. Contact the shop if you need to update it."
        />
        <ProfileField
          id="profile-contact"
          label="Contact number"
          type="tel"
          autoComplete="tel"
          value={contactNumber}
          onChange={(event) => setContactNumber(event.target.value)}
          error={errors.contactNumber}
        />
        <div className="profile-actions">
          <button type="submit" className="proceed-button" disabled={isSaving || !isChanged}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
        {errors.form ? <p className="field-error" role="alert">{errors.form}</p> : null}
      </form>
    </section>
  );
};

const PASSWORD_FIELDS = ["currentPassword", "newPassword", "confirmPassword"] as const;

const PasswordSection = ({ onToast }: Pick<ProfilePageProps, "onToast">) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors<(typeof PASSWORD_FIELDS)[number]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = {
      currentPassword: currentPassword ? undefined : "Enter your current password",
      newPassword: validateNewPassword(newPassword),
      confirmPassword: validatePasswordMatch(newPassword, confirmPassword)
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onToast("Password changed. Other devices have been signed out.", "success");
    } catch (error) {
      setErrors(apiErrors(error, PASSWORD_FIELDS));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="profile-card" aria-labelledby="profile-password-title">
      <h2 id="profile-password-title">Change Password</h2>
      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <ProfileField
          id="profile-current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={errors.currentPassword}
        />
        <ProfileField
          id="profile-new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            setErrors((current) => ({ ...current, newPassword: undefined, form: undefined }));
          }}
          error={errors.newPassword}
          hint={<PasswordRules password={newPassword} />}
        />
        <ProfileField
          id="profile-confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setErrors((current) => ({ ...current, confirmPassword: undefined, form: undefined }));
          }}
          error={errors.confirmPassword}
          hint={confirmPassword ? <PasswordMatch password={newPassword} confirmation={confirmPassword} /> : undefined}
        />
        <div className="profile-actions">
          <button type="submit" className="proceed-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Change password"}
          </button>
        </div>
        {errors.form ? <p className="field-error" role="alert">{errors.form}</p> : null}
      </form>
    </section>
  );
};

export const ProfilePage = (props: ProfilePageProps) => (
  <section className="cart-page profile-page">
    <div className="cart-page-header">
      <Link to="/" className="back-home-button">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M10 3 5 8l5 5" />
        </svg>
        Back to Home
      </Link>
      <h1>My Profile</h1>
    </div>
    <div className="profile-layout">
      <AvatarSection {...props} />
      <DetailsSection {...props} />
      <PasswordSection onToast={props.onToast} />
    </div>
  </section>
);
