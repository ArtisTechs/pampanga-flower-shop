import { useEffect, useState } from "react";
import { ApiError, clearAuthToken, getAuthToken, isAuthTokenKey, setAuthToken } from "../api/client";
import { fetchMe, loginRequest, logoutRequest, registerRequest } from "../api/shop";
import type { Account, RegisterInput } from "../types/shop";

export const useAuth = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => getAuthToken() !== null);

  useEffect(() => {
    let isCurrent = true;

    // Restores the session from the stored token (also when another tab logs in or out).
    const restoreSession = () => {
      const token = getAuthToken();
      if (!token) {
        setCurrentAccount(null);
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      fetchMe()
        .then((account) => {
          if (isCurrent) {
            setCurrentAccount(account);
          }
        })
        .catch((error: unknown) => {
          // Only clear the token this request used; a newer login may have replaced it meanwhile.
          if (error instanceof ApiError && error.status === 401 && getAuthToken() === token) {
            clearAuthToken();
          }
          if (isCurrent) {
            setCurrentAccount(null);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsAuthLoading(false);
          }
        });
    };

    const onStorage = (event: StorageEvent) => {
      if (isAuthTokenKey(event.key)) {
        restoreSession();
      }
    };

    restoreSession();
    window.addEventListener("storage", onStorage);
    return () => {
      isCurrent = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { token, account } = await loginRequest(email.trim(), password);
    setAuthToken(token);
    setCurrentAccount(account);
    return account;
  };

  const register = async (input: RegisterInput) => {
    const { token, account } = await registerRequest(input);
    setAuthToken(token);
    setCurrentAccount(account);
    return account;
  };

  const logout = () => {
    // logoutRequest reads the token before it is cleared below; a failed request only leaves an expiring session.
    void logoutRequest().catch(() => undefined);
    clearAuthToken();
    setCurrentAccount(null);
  };

  return { currentAccount, isAuthLoading, isLoggedIn: currentAccount !== null, login, register, logout };
};
