import { useState } from "react";
import type { PaymentMethod } from "../types/shop";

interface PaymentMethodPickerProps {
  methods: PaymentMethod[];
  selectedId: string;
  onSelect: (methodId: string) => void;
  disabled?: boolean;
}

// Bank / e-wallet tabs, then the chosen account's QR code, name, and number for the customer to pay.
export const PaymentMethodPicker = ({ methods, selectedId, onSelect, disabled = false }: PaymentMethodPickerProps) => {
  const selected = methods.find((method) => method.id === selectedId) ?? null;

  return (
    <div className="payment-picker">
      <div className="payment-picker-options" role="radiogroup" aria-label="Payment method">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={method.id === selectedId}
            className={method.id === selectedId ? "active" : ""}
            onClick={() => onSelect(method.id)}
            disabled={disabled}
          >
            <strong>{method.provider}</strong>
            <span>{method.kind}</span>
          </button>
        ))}
      </div>
      {selected ? <PaymentAccountCard account={selected} qrImageUrl={selected.qrImageUrl} /> : null}
    </div>
  );
};

interface PaymentAccountCardProps {
  account: { provider: string; accountName: string | null; accountNumber: string | null };
  qrImageUrl?: string | null;
}

export const PaymentAccountCard = ({ account, qrImageUrl = null }: PaymentAccountCardProps) => {
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    if (!account.accountNumber) {
      return;
    }
    try {
      await navigator.clipboard.writeText(account.accountNumber.replace(/\s+/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number is still shown for manual copying.
    }
  };

  return (
    <div className="payment-account">
      {qrImageUrl ? (
        <a href={qrImageUrl} target="_blank" rel="noreferrer" className="payment-account-qr" title="Open the QR code in full size">
          <img src={qrImageUrl} alt={`${account.provider} QR code`} />
        </a>
      ) : null}
      <dl>
        <div>
          <dt>{account.provider}</dt>
          <dd>{account.accountName}</dd>
        </div>
        {account.accountNumber ? (
          <div>
            <dt>Account number</dt>
            <dd className="payment-account-number">
              <span>{account.accountNumber}</span>
              <button type="button" onClick={copyNumber}>{copied ? "Copied" : "Copy"}</button>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
};
