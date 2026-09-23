import rateLimit from "express-rate-limit";

export function createRateLimiter(opts: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "rate_limited", message: opts.message } },
  });
}

// OTP requests go straight from the frontend to Supabase's own phone-auth
// endpoint (never through this API), and Supabase already rate-limits that
// server-side — there's nothing in this codebase to rate-limit for OTP.
export const orderCreationRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Too many orders created recently. Please wait a moment and try again.",
});

// Backups, delete-all-orders and delete-store are all destructive/heavy
// enough that a superadmin (or a compromised superadmin session) shouldn't
// be able to fire them rapidly.
export const superadminDestructiveRateLimiter = createRateLimiter({
  windowMs: 5 * 60_000,
  max: 10,
  message: "Too many destructive superadmin actions recently. Please wait a few minutes and try again.",
});

// The superadmin login is a fixed username+password, not OTP-backed, so this
// is the only thing standing between it and a brute-force guesser.
export const superadminLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});
