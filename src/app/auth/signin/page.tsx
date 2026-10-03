"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "demo_loading" | "success">("idle");

  const isDemoMode =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false");

  const getSafeRedirectUrl = (): string => {
    const fromParam = searchParams.get("from") || searchParams.get("redirect");
    if (fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//") && !fromParam.startsWith("/\\")) {
      return fromParam;
    }
    return "/";
  };

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError("Please enter your work email.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid work email.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (val: string): boolean => {
    if (!val) {
      setPasswordError("Please enter your password.");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) validateEmail(e.target.value);
    if (generalError) setGeneralError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) validatePassword(e.target.value);
    if (generalError) setGeneralError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setStatus("loading");

    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.success) {
        setStatus("success");
        const targetUrl = getSafeRedirectUrl();
        window.location.href = targetUrl;
      } else {
        setGeneralError("Unable to sign in. Please check your credentials.");
        setStatus("idle");
      }
    } catch {
      setGeneralError("Unable to sign in. Please check your credentials.");
      setStatus("idle");
    }
  };

  const handleDemoLogin = async () => {
    setGeneralError("");
    setEmailError("");
    setPasswordError("");
    setStatus("demo_loading");

    try {
      const result = await signIn("mitpatel@nenotechnology.com", "password123");
      if (result.success) {
        setStatus("success");
        const targetUrl = getSafeRedirectUrl();
        window.location.href = targetUrl;
      } else {
        setGeneralError("Unable to initialize demo workspace. Please try again.");
        setStatus("idle");
      }
    } catch {
      setGeneralError("Unable to initialize demo workspace. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <Card className="w-full max-w-sm p-6 sm:p-8 border border-slate-200/90 bg-white shadow-sm rounded-lg">
      <CardHeader className="text-center pb-6 p-0">
        <div className="mx-auto h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm mb-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
          Sign in to Studio
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-1">
          Enter your credentials to access your autonomous workspace
        </CardDescription>
      </CardHeader>

      {/* Demo Mode Container */}
      {isDemoMode && (
        <div className="my-5 p-3.5 rounded-lg bg-orange-50/70 border border-orange-200/80">
          <div className="flex items-center gap-1.5 mb-1 text-orange-800 font-semibold text-xs">
            <Building2 className="h-3.5 w-3.5 text-orange-600 shrink-0" />
            <span>Demo Workspace</span>
          </div>
          <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
            Try the AI Content Studio with a pre-configured workspace.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDemoLogin}
            disabled={status !== "idle"}
            className="w-full justify-center text-xs font-semibold text-orange-700 hover:text-white border-orange-300 bg-white hover:bg-orange-600 transition-colors h-8"
          >
            {status === "demo_loading" ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-600" />
                Starting Demo Workspace...
              </span>
            ) : status === "success" ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                Redirecting...
              </span>
            ) : (
              <span>Try Demo Workspace</span>
            )}
          </Button>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="mb-4 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="work-email"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Work Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              id="work-email"
              type="email"
              required
              autoComplete="email"
              disabled={status !== "idle"}
              value={email}
              onChange={handleEmailChange}
              onBlur={() => email && validateEmail(email)}
              placeholder="name@company.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error-text" : undefined}
              className={`w-full bg-white border rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                emailError
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-200 focus:border-orange-500 focus:ring-orange-500"
              }`}
            />
          </div>
          {emailError && (
            <p id="email-error-text" className="mt-1 text-xs text-red-600 font-medium">
              {emailError}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={status !== "idle"}
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => password && validatePassword(password)}
              placeholder="••••••••"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error-text" : undefined}
              className={`w-full bg-white border rounded-md pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                passwordError
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-200 focus:border-orange-500 focus:ring-orange-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors rounded focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {passwordError && (
            <p id="password-error-text" className="mt-1 text-xs text-red-600 font-medium">
              {passwordError}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="default"
          className="w-full gap-2 mt-2 font-semibold h-9"
          disabled={status !== "idle"}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="h-4 w-4 text-white" />
              <span>Redirecting...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="h-72 w-full max-w-sm rounded-lg bg-white border border-slate-200 animate-pulse flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
