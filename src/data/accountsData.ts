import type { MockAccount } from "../types/shop";

export const mockAccounts: MockAccount[] = [
  {
    id: "acct-admin-001",
    role: "admin",
    fullName: "Joe Keery",
    email: "admin@pampangaflowershop.com",
    password: "admin123",
    contactNumber: "0917 555 0101",
    avatarInitials: "JK"
  },
  {
    id: "acct-user-001",
    role: "user",
    fullName: "Maria Santos",
    email: "maria.santos@example.com",
    password: "user123",
    contactNumber: "0917 555 0124",
    avatarInitials: "MS"
  },
  {
    id: "acct-user-002",
    role: "user",
    fullName: "Juan Dela Cruz",
    email: "juan.delacruz@example.com",
    password: "user123",
    contactNumber: "0918 555 0188",
    avatarInitials: "JD"
  },
  {
    id: "acct-user-003",
    role: "user",
    fullName: "Ralph Manalang",
    email: "ralph.manalang@example.com",
    password: "user123",
    contactNumber: "0920 555 0166",
    avatarInitials: "RM"
  }
];

export const findMockAccount = (email: string, password: string) =>
  mockAccounts.find(
    (account) =>
      account.email.toLowerCase() === email.trim().toLowerCase() &&
      account.password === password
  );
