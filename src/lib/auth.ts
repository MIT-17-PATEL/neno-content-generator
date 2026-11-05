import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { getAuthSecret } from "@/lib/auth-secret";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSessionToken(payload: TokenPayload): Promise<string> {
  const JWT_SECRET = getAuthSecret();
  if (!JWT_SECRET) throw new Error("AUTH_SECRET (32+ characters) must be set in production.");
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  const JWT_SECRET = getAuthSecret();
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
