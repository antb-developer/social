import { useState, type FormEvent } from "react";
import { DEV_OTP_CODE, DEV_OTP_MODE, useOtpAuth } from "../../hooks/useOtpAuth";
import { button, input } from "../../lib/ui";

type Props = {
  onSuccess: () => void;
  onClose: () => void;
};

export function OtpLoginModal({ onSuccess, onClose }: Props) {
  const { step, loading, error, sendOtp, verifyOtp, saveName, reset } = useOtpAuth();
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState(DEV_OTP_MODE ? DEV_OTP_CODE : "");
  const [nameInput, setNameInput] = useState("");

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    await sendOtp(phoneInput);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const result = await verifyOtp(codeInput);
    if (result === "done") {
      onSuccess();
    }
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    const ok = await saveName(nameInput);
    if (ok) {
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            {step === "phone" && "Enter your phone number"}
            {step === "otp" && "Enter OTP"}
            {step === "name" && "What's your name?"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>

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
            <button type="button" onClick={reset} className="text-sm text-gray-500 underline hover:text-gray-700">
              Change number
            </button>
          </form>
        )}

        {step === "name" && (
          <form onSubmit={handleSaveName} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={input}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className={`w-full ${button.primary}`}>
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
