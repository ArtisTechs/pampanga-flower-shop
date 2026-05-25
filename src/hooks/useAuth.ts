import { useEffect, useState } from "react";
import { findMockAccount, mockAccounts } from "../data/accountsData";
import type { MockAccount } from "../types/shop";

const LOGIN_KEY = "isLoggedIn";
const ACCOUNT_ID_KEY = "activeAccountId";

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem(LOGIN_KEY) === "true");
  const [currentAccount, setCurrentAccount] = useState<MockAccount | null>(() => {
    const accountId = localStorage.getItem(ACCOUNT_ID_KEY);
    return mockAccounts.find((account) => account.id === accountId) ?? null;
  });

  const login = (email: string, password: string): boolean => {
    const account = findMockAccount(email, password);

    if (!account) {
      return false;
    }

    localStorage.setItem(LOGIN_KEY, "true");
    localStorage.setItem(ACCOUNT_ID_KEY, account.id);
    setCurrentAccount(account);
    setIsLoggedIn(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(ACCOUNT_ID_KEY);
    setCurrentAccount(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const onStorage = () => {
      const accountId = localStorage.getItem(ACCOUNT_ID_KEY);
      setIsLoggedIn(localStorage.getItem(LOGIN_KEY) === "true");
      setCurrentAccount(mockAccounts.find((account) => account.id === accountId) ?? null);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { currentAccount, isLoggedIn, login, logout };
};
