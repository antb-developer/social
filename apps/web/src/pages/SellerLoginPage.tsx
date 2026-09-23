import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DEV_OTP_CODE, DEV_OTP_MODE, useSellerOtpAuth } from "../hooks/useSellerOtpAuth";
import { button, card, input } from "../lib/ui";

export function SellerLoginPage() {
  const navigate = useNavigate();
  const { step, loading, error, sendOtp, verifyOtp, createStore } = useSellerOtpAuth();
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState(DEV_OTP_MODE ? DEV_OTP_CODE : "");
  const [storeName, setStoreName] = useState("");

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    await sendOtp(phoneInput);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const result = await verifyOtp(codeInput);
    if (result === "done") {
      navigate("/dashboard");
    }
  }

  async function handleCreateStore(e: FormEvent) {
    e.preventDefault();
    const ok = await createStore(storeName);
    if (ok) {
      navigate("/dashboard");
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10 sm:py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Seller login</h1>

      <div className={card}>
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className={input}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={`w-full ${button.primary}`}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="space-y-3">
            {DEV_OTP_MODE && <p className="text-xs text-gray-500">Dev mode: use OTP {DEV_OTP_CODE}</p>}
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className={input}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={`w-full ${button.primary}`}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}

        {step === "store-setup" && (
          <form onSubmit={handleCreateStore} className="space-y-3">
            <p className="text-sm text-gray-600">Welcome! What's your store called?</p>
            <input
              type="text"
              placeholder="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className={input}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={`w-full ${button.primary}`}>
              {loading ? "Creating..." : "Create store"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
