import type { PaymentStatus } from "../types/shop";

const statusClass: Record<PaymentStatus, string> = {
  "Pay on pick-up": "neutral",
  "Awaiting payment": "awaiting",
  "For verification": "verifying",
  Verified: "verified",
  Rejected: "rejected"
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <span className={`payment-status payment-status-${statusClass[status]}`}>{status}</span>
);
