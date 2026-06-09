"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api, { authApi } from "./api";

interface AuthUser {
  accessToken: string;
  role: string;
  establishmentId: string;
  slug: string;
  professionalId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (login: string, password: string) => Promise<{ role: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    const establishmentId = localStorage.getItem("establishment_id");
    const slug = localStorage.getItem("establishment_slug") ?? "";
    const professionalId = localStorage.getItem("professional_id") ?? undefined;

    if (!token || !role || !establishmentId) {
      setIsLoading(false);
      return;
    }

    if (slug || role === "Profissional") {
      setUser({ accessToken: token, role, establishmentId, slug, professionalId: professionalId || undefined });
      setIsLoading(false);
    } else {
      // Sessão antiga sem slug — busca da API e salva para próximas vezes
      api.get("/api/establishments/my-slug")
        .then(res => {
          const fetchedSlug: string = res.data.slug ?? "";
          localStorage.setItem("establishment_slug", fetchedSlug);
          setUser({ accessToken: token, role, establishmentId, slug: fetchedSlug, professionalId: professionalId || undefined });
        })
        .catch(() => setUser({ accessToken: token, role, establishmentId, slug: "", professionalId: professionalId || undefined }))
        .finally(() => setIsLoading(false));
    }
  }, []);

  const login = async (login: string, password: string): Promise<{ role: string }> => {
    const { data } = await authApi.login(login, password);
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("user_role", data.role);
    localStorage.setItem("establishment_id", data.establishmentId);
    localStorage.setItem("establishment_slug", data.slug ?? "");
    if (data.professionalId) {
      localStorage.setItem("professional_id", data.professionalId);
    } else {
      localStorage.removeItem("professional_id");
    }
    setUser({
      accessToken: data.accessToken,
      role: data.role,
      establishmentId: data.establishmentId,
      slug: data.slug ?? "",
      professionalId: data.professionalId,
    });
    return { role: data.role };
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("establishment_id");
    localStorage.removeItem("establishment_slug");
    localStorage.removeItem("professional_id");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
