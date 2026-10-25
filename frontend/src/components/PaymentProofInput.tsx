import { useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { IMAGE_UPLOAD_TYPES, validateImageFile } from "../utils/validation";

interface PaymentProofInputProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

// File picker with a preview for the customer's payment screenshot.
export const PaymentProofInput = ({ file, onChange, disabled = false }: PaymentProofInputProps) => {
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(file);

  const pickFile = (picked: File | undefined) => {
    if (!picked) {
      return;
    }
    const problem = validateImageFile(picked);
    setError(problem ?? null);
    if (!problem) {
      onChange(picked);
    }
  };

  return (
    <div className="payment-proof">
      <label className={`payment-proof-drop ${previewUrl ? "has-image" : ""} ${error ? "invalid" : ""}`}>
        <input
          type="file"
          accept={IMAGE_UPLOAD_TYPES.join(",")}
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          disabled={disabled}
        />
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Payment screenshot preview" />
            <span>Change screenshot</span>
          </>
        ) : (
          <span>
            <strong>Attach payment screenshot</strong>
            <small>JPG, PNG, or WebP · up to 2 MB</small>
          </span>
        )}
      </label>
      {file ? <span className="payment-proof-name">{file.name}</span> : null}
      {error ? <span className="payment-proof-error" role="alert">{error}</span> : null}
    </div>
  );
};
