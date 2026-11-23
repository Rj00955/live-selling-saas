export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const UNAUTHORIZED_EVENT = "tiako:unauthorized";

// Équivalent de fetch() qui envoie toujours le cookie de session.
// Toute réponse 401 prévient AuthProvider, qui renvoie vers /login.
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(input, { ...init, credentials: "include" });

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  return response;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SELLER" | "STOCK_MANAGER";
};

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "E-mail ou mot de passe incorrect"
        : "Connexion impossible pour le moment",
    );
  }

  const data = (await response.json()) as { user: AuthUser };
  return data.user;
}

// Renvoie null si la personne n'est pas connectée ou si le serveur est injoignable.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}