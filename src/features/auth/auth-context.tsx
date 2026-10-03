"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Workspace } from "@/types";

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setActiveWorkspace: (ws: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWorkspaces(data.workspaces || []);
        if (data.workspaces?.length > 0) {
          const storedWsId = localStorage.getItem("ai_studio_active_workspace");
          const found = data.workspaces.find((w: Workspace) => w.id === storedWsId);
          setActiveWorkspaceState(found || data.workspaces[0]);
        }
      }
    } catch (e) {
      console.error("Session load failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("ai_studio_active_workspace", ws.id);
  };

  const refreshWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
        if (!activeWorkspace && data.workspaces.length > 0) {
          setActiveWorkspace(data.workspaces[0]);
        }
      }
    } catch (e) {
      console.error("Refresh workspaces error:", e);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Sign in failed" };

      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      if (data.workspaces?.length > 0) {
        setActiveWorkspace(data.workspaces[0]);
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error during sign in" };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Sign up failed" };

      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      if (data.workspaces?.length > 0) {
        setActiveWorkspace(data.workspaces[0]);
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error during sign up" };
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      localStorage.removeItem("ai_studio_active_workspace");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        isLoading,
        signIn,
        signUp,
        signOut,
        setActiveWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
