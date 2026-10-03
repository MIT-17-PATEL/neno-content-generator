"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("mitpatel@nenotechnology.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const performSignIn = async (userEmail: string, userPass: string) => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn(userEmail.trim().toLowerCase(), userPass.trim());
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.error || "Invalid credentials");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSignIn(email, password);
  };

  const handleQuickLogin = async () => {
    setEmail("mitpatel@nenotechnology.com");
    setPassword("password123");
    await performSignIn("mitpatel@nenotechnology.com", "password123");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-studio-800 bg-studio-900/90 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-brand-900/40 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign In to Studio</CardTitle>
          <CardDescription>
            Enter your credentials to access your autonomous workspace
          </CardDescription>
        </CardHeader>

        {/* Demo Credentials Quick Pill */}
        <div className="mb-5 p-3 rounded-lg bg-brand-950/40 border border-brand-800/40 text-xs text-studio-300 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-brand-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Demo Credentials Pre-configured
            </span>
            <button
              type="button"
              onClick={handleQuickLogin}
              disabled={isLoading}
              className="text-[11px] font-semibold text-white bg-brand-600 hover:bg-brand-500 px-2.5 py-1 rounded transition-colors"
            >
              1-Click Sign In
            </button>
          </div>
          <div className="text-[11px] text-studio-400 space-y-0.5">
            <div>Email: <code className="text-white font-mono bg-studio-950 px-1 py-0.5 rounded">mitpatel@nenotechnology.com</code></div>
            <div>Password: <code className="text-white font-mono bg-studio-950 px-1 py-0.5 rounded">password123</code></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-studio-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mitpatel@nenotechnology.com"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-studio-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full gap-2 mt-2"
            disabled={isLoading}
          >
            <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-studio-800 text-center">
          <p className="text-xs text-studio-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
