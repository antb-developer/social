import { useState } from "react";
import { ApiError, apiFetch } from "../lib/apiClient";
import { normalizeIndianPhone } from "../lib/phone";
import { setStaticAuthUser, STATIC_OTP_CODE } from "../lib/staticAuth";
// TEMPORARY: real Supabase phone-OTP calls are disabled below in favor of a
// static "1234" code — see hooks/useOtpAuth.ts for the full explanation and
// the matching backend bypass in apps/api.
// import { supabase } from "../lib/supabaseClient";

export const DEV_OTP_MODE = import.meta.env.VITE_DEV_OTP_MODE === "true";
export const DEV_OTP_CODE = STATIC_OTP_CODE;

type Step = "phone" | "otp" | "store-setup";
type VerifyResult = "done" | "needs-store" | false;

export function useSellerOtpAuth() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(rawPhone: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    const normalized = normalizeIndianPhone(rawPhone);

    // const { error: sendError } = await supabase.auth.signInWithOtp({ phone: normalized });
    // if (sendError) {
    //   setLoading(false);
    //   setError(sendError.message);
    //   return false;
    // }

    setLoading(false);
    setPhone(normalized);
    setStep("otp");
    return true;
  }

  async function verifyOtp(code: string): Promise<VerifyResult> {
    setLoading(true);
    setError(null);

    if (code !== STATIC_OTP_CODE) {
      setLoading(false);
      setError(`Use the static dev code ${STATIC_OTP_CODE} for now.`);
      return false;
    }

    try {
      const result = await apiFetch<{ userId: string; phone: string }>("/api/dev/login", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setStaticAuthUser({ userId: result.userId, phone: result.phone });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Verification failed");
      return false;
    }

    // Real Supabase verification (restore this, delete the block above):
    // const { data, error: verifyError } = await supabase.auth.verifyOtp({
    //   phone,
    //   token: code,
    //   type: "sms",
    // });
    // if (verifyError || !data.session) {
    //   setLoading(false);
    //   setError(verifyError?.message ?? "Verification failed");
    //   return false;
    // }

    try {
      await apiFetch("/api/seller/settings");
      setLoading(false);
      return "done";
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.status === 403) {
        setStep("store-setup");
        return "needs-store";
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  }

  async function createStore(storeName: string, ownerName?: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/seller/signup", {
        method: "POST",
        body: JSON.stringify({ store_name: storeName, owner_name: ownerName || undefined }),
      });
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      setError(err instanceof ApiError ? err.message : "Could not create your store");
      return false;
    }
  }

  function reset() {
    setStep("phone");
    setError(null);
  }

  return { step, phone, loading, error, sendOtp, verifyOtp, createStore, reset };
}
