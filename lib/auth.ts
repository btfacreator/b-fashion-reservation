import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 60 * 60 * 24;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<void> {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}
