import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  devOtpMode: process.env.DEV_OTP_MODE === "true",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  superadminUsername: process.env.SUPERADMIN_USERNAME ?? "superadmin",
  superadminPassword: process.env.SUPERADMIN_PASSWORD ?? "Superadmin@123",
  // Only matters if someone gets a superadmin token to begin with — set a
  // real secret via env in production so tokens can't be forged.
  superadminTokenSecret: process.env.SUPERADMIN_TOKEN_SECRET ?? "dev-superadmin-token-secret-change-me",
};

export { required };
