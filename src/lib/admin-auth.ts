import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const cookieName = "branch_admin";
const sessionDurationSeconds = 8 * 60 * 60;
const loginAttempts = new Map<string, { count: number; startedAt: number }>();

function getSessionSecret(): string {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.ADMIN_SESSION_SECRET
  ) {
    throw new Error("ADMIN_SESSION_SECRET is verplicht in productie.");
  }
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function signature(expiresAt: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(`branch-admin:${expiresAt}`)
    .digest("hex");
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function checkLoginRateLimit(request: Request): boolean {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(address);
  if (!attempt || now - attempt.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(address, { count: 0, startedAt: now });
    return true;
  }
  return attempt.count < 10;
}

export function recordLoginAttempt(request: Request, succeeded: boolean): void {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (succeeded) {
    loginAttempts.delete(address);
    return;
  }
  const attempt = loginAttempts.get(address) ?? {
    count: 0,
    startedAt: Date.now(),
  };
  attempt.count += 1;
  loginAttempts.set(address, attempt);
}

export function verifyAdminPassword(password: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;
  return timingSafeEqual(digest(password), digest(configuredPassword));
}

export function createAdminCookie(): string {
  const expiresAt = String(
    Math.floor(Date.now() / 1000) + sessionDurationSeconds,
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${expiresAt}.${signature(expiresAt)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionDurationSeconds}${secure}`;
}

export function clearAdminCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAdminAuthorized(request: Request): boolean {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const value = cookie?.slice(cookieName.length + 1);
  const [expiresAt, providedSignature] = value?.split(".") ?? [];
  if (
    !expiresAt ||
    !providedSignature ||
    Number(expiresAt) <= Math.floor(Date.now() / 1000)
  )
    return false;
  try {
    return timingSafeEqual(
      digest(providedSignature),
      digest(signature(expiresAt)),
    );
  } catch {
    return false;
  }
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "Je moet aanmelden als beheerder." },
    { status: 401 },
  );
}
