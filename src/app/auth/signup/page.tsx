"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const validate = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError("Please enter your full name.");
      valid = false;
    } else {
      setNameError("");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid work email.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!validate()) {
      return;
    }

    setStatus("loading");

    try {
      const result = await signUp(name.trim(), email.trim().toLowerCase(), password);
      if (result.success) {
        setStatus("success");
        window.location.href = "/";
      } else {
        setGeneralError(result.error || "Unable to complete registration.");
        setStatus("idle");
      }
    } catch {
      setGeneralError("Registration failed. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-orange-600 text-white font-bold text-lg mb-3 shadow-sm">
          AI
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          AI Content Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          Autonomous Content Workspace
        </p>
      </div>

      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-xl">
        <CardHeader className="text-center pb-5 pt-0 px-0">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Get started with AI Content Studio
          </CardDescription>
        </CardHeader>

        {generalError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="full-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="full-name"
                type="text"
                required
                disabled={status !== "idle"}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Mit Patel"
                className={`w-full bg-white border rounded-md pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                  nameError
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                }`}
              />
            </div>
            {nameError && (
              <p className="mt-1 text-xs text-red-600">{nameError}</p>
            )}
          </div>

          {/* Work Email */}
          <div>
            <label
              htmlFor="signup-email"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                disabled={status !== "idle"}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                placeholder="name@company.com"
                className={`w-full bg-white border rounded-md pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                  emailError
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="signup-password"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={status !== "idle"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="At least 6 characters"
                className={`w-full bg-white border rounded-md pl-9 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-1 ${
                  passwordError
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors rounded focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 mt-2 bg-orange-600 hover:bg-orange-700 text-white font-medium"
            disabled={status !== "idle"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Workspace...</span>
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="h-4 w-4 text-white" />
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
