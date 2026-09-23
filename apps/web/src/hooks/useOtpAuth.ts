import { useState } from "react";
import { apiFetch } from "../lib/apiClient";
// TEMPORARY: real Supabase phone-OTP calls are disabled below in favor of a
// static "1234" code, since phone auth isn't configured on the Supabase
// project yet. See lib/staticAuth.ts and apps/api's middleware/auth.ts +
// controllers/devAuthController.ts for the matching backend bypass. To
// restore real OTP: uncomment the supabase.auth.* calls below, delete the
// static-auth ones, and remove the backend bypass.
// import { fetchCustomerProfile, saveCustomerName } from "../lib/customerProfile";
import { normalizeIndianPhone } from "../lib/phone";
import { setStaticAuthUser, STATIC_OTP_CODE } from "../lib/staticAuth";
// import { supabase } from "../lib/supabaseClient";

export const DEV_OTP_MODE = import.meta.env.VITE_DEV_OTP_MODE === "true";
export const DEV_OTP_CODE = STATIC_OTP_CODE;

type Step = "phone" | "otp" | "name";
type VerifyResult = "done" | "needs-name" | false;

export function useOtpAuth() {
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
      const result = await apiFetch<{ userId: string; phone: string; name: string | null }>(
        "/api/dev/login",
        { method: "POST", body: JSON.stringify({ phone }) }
      );
      setStaticAuthUser({ userId: result.userId, phone: result.phone });
      setLoading(false);

      if (!result.name) {
        setStep("name");
        return "needs-name";
      }
      return "done";
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
    // const profile = await fetchCustomerProfile(data.session.user.id);
    // setLoading(false);
    // if (!profile?.name) {
    //   setStep("name");
    //   return "needs-name";
    // }
    // return "done";
  }

  async function saveName(name: string): Promise<boolean> {
    setLoading(true);
    setError(null);

    try {
      await apiFetch("/api/dev/customer-name", { method: "POST", body: JSON.stringify({ name }) });
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Could not save your name");
      return false;
    }

    // Real Supabase version (restore this, delete the block above):
    // const { data } = await supabase.auth.getSession();
    // if (!data.session) {
    //   setLoading(false);
    //   setError("Your session expired. Please start over.");
    //   return false;
    // }
    // await saveCustomerName(data.session.user.id, phone, name);
    // setLoading(false);
    // return true;
  }

  function reset() {
    setStep("phone");
    setError(null);
  }

  return { step, phone, loading, error, sendOtp, verifyOtp, saveName, reset };
}
