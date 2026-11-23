"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  fetchCurrentUser,
  logout,
  UNAUTHORIZED_EVENT,
  type AuthUser,
} from "../lib/api";

type AuthContextValue = {
  user: AuthUser;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Vérification initiale de la session
  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((current) => {
      if (cancelled) return;
      if (current) setUser(current);
      else router.replace("/login");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Sortie vers /login dès que la session n'est plus valide :
  // réponse 401 d'un appel API, retour sur l'onglet, ou page restaurée du cache.
  useEffect(() => {
    function leave() {
      setUser(null);
      router.replace("/login");
    }

    function recheck() {
      fetchCurrentUser().then((current) => {
        if (!current) leave();
      });
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) recheck();
    }

    function onVisible() {
      if (document.visibilityState === "visible") recheck();
    }

    window.addEventListener(UNAUTHORIZED_EVENT, leave);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, leave);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  async function signOut() {
    await logout();
    setUser(null);
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6F4] text-sm text-[#7B857D]">
        Vérification de la session…
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}