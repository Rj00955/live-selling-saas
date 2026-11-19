export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Équivalent de fetch() qui envoie toujours le cookie de session.
// La redirection vers /login est gérée par le composant AuthGuard.
export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
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
  const response = await apiFetch(`${API_URL}/auth/login`, {
    method: "POST",
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
    const response = await apiFetch(`${API_URL}/auth/me`);
    if (!response.ok) return null;
    const data = (await response.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiFetch(`${API_URL}/auth/logout`, { method: "POST" });
}