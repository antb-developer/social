import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { DEV_OTP_CODE, DEV_OTP_MODE, useOtpAuth } from "../hooks/useOtpAuth";
import { useSellerOtpAuth } from "../hooks/useSellerOtpAuth";
import { button } from "../lib/ui";

// Minimal take on the TailAdmin sign-in layout: form on the left, brand panel on the right.
const field =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10";
const label = "mb-1.5 block text-sm font-medium text-gray-700";

// Keeps digits only, and drops a pasted +91 / 0 prefix so "+91 98765 43210" becomes the 10-digit number.
function cleanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const prefixed = (digits.length === 12 && digits.startsWith("91")) || (digits.length === 11 && digits.startsWith("0"));
  return prefixed ? digits.slice(-10) : digits.slice(0, 10);
}

type Role = "store" | "customer";
type View = "details" | "otp" | "name";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const role: Role = params.get("role") === "customer" ? "customer" : "store";
  const isSignup = mode === "signup";

  const customer = useOtpAuth();
  const seller = useSellerOtpAuth();
  const auth = role === "store" ? seller : customer;

  const [view, setView] = useState<View>("details");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(DEV_OTP_MODE ? DEV_OTP_CODE : "");
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? auth.error;

  function switchRole(next: Role) {
    setLocalError(null);
    customer.reset();
    seller.reset();
    setParams(
      (prev) => {
        prev.set("role", next);
        return prev;
      },
      { replace: true }
    );
  }

  function finish() {
    if (role === "store") {
      navigate("/dashboard");
      return;
    }
    const next = params.get("next");
    navigate(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  }

  function backToDetails() {
    setLocalError(null);
    customer.reset();
    seller.reset();
    setView("details");
  }

  async function handleDetails(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (phone.length !== 10) {
      setLocalError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (await auth.sendOtp(phone)) setView("otp");
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (role === "store") {
      const result = await seller.verifyOtp(code);
      if (result === "done") return finish();
      if (result !== "needs-store") return;
      if (!isSignup) {
        setLocalError("No store found for this number. Sign up to create one.");
        return;
      }
      if (await seller.createStore(storeName.trim(), name.trim())) finish();
      return;
    }

    const result = await customer.verifyOtp(code);
    if (result === "done") return finish();
    if (result !== "needs-name") return;
    if (isSignup) {
      if (await customer.saveName(name.trim())) finish();
    } else {
      // Logging in with a number that has no profile yet: ask for the name once.
      setView("name");
    }
  }

  async function handleName(e: FormEvent) {
    e.preventDefault();
    if (await customer.saveName(name.trim())) finish();
  }

  const title =
    view === "otp" ? "Verify your number" : view === "name" ? "One last thing" : isSignup ? "Sign up" : "Log in";
  const subtitle =
    view === "otp"
      ? `Enter the OTP sent to +91 ${phone}.`
      : view === "name"
        ? "What should we call you?"
        : isSignup
          ? "Create your account with your mobile number."
          : "Enter your mobile number to continue.";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to home
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-title-sm font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-2 text-theme-sm text-gray-500">{subtitle}</p>

          {view === "details" && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Account type">
                {(["store", "customer"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-selected={role === r}
                    onClick={() => switchRole(r)}
                    className={`rounded-md py-2 text-sm font-medium transition-colors ${
                      role === r ? "bg-white text-gray-900 shadow-theme-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {r === "store" ? "I have a store" : "I'm a customer"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleDetails} className="mt-6 space-y-5">
                {isSignup && (
                  <div>
                    <label htmlFor="name" className={label}>
                      Your name
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Amit Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={field}
                      required
                    />
                  </div>
                )}
                {isSignup && role === "store" && (
                  <div>
                    <label htmlFor="store" className={label}>
                      Store name
                    </label>
                    <input
                      id="store"
                      type="text"
                      placeholder="Amit's Kirana Store"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className={field}
                      required
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="phone" className={label}>
                    Mobile number
                  </label>
                  <div className="flex">
                    <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(cleanPhone(e.target.value))}
                      className={`${field} rounded-l-none`}
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-error-600">{error}</p>}
                <button type="submit" disabled={auth.loading} className={`w-full ${button.brand} h-11`}>
                  {auth.loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-600">
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <Link
                  to={`${isSignup ? "/login" : "/signup"}?role=${role}`}
                  className="font-medium text-brand-500 hover:text-brand-600"
                >
                  {isSignup ? "Log in" : "Sign up"}
                </Link>
              </p>
            </>
          )}

          {view === "otp" && (
            <form onSubmit={handleVerify} className="mt-6 space-y-5">
              <div>
                <label htmlFor="otp" className={label}>
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${field} text-center text-lg tracking-[0.5em]`}
                  required
                />
                {DEV_OTP_MODE && <p className="mt-2 text-xs text-gray-500">Dev mode: use OTP {DEV_OTP_CODE}</p>}
              </div>
              {error && <p className="text-sm text-error-600">{error}</p>}
              {error?.startsWith("No store found") && (
                <Link to="/signup?role=store" className="block text-sm font-medium text-brand-500 hover:text-brand-600">
                  Create a store instead
                </Link>
              )}
              <button type="submit" disabled={auth.loading} className={`w-full ${button.brand} h-11`}>
                {auth.loading ? "Verifying..." : isSignup ? "Verify and create account" : "Verify and log in"}
              </button>
              <button type="button" onClick={backToDetails} className="text-sm text-gray-500 hover:text-gray-700">
                &larr; Change number
              </button>
            </form>
          )}

          {view === "name" && (
            <form onSubmit={handleName} className="mt-6 space-y-5">
              <div>
                <label htmlFor="name-step" className={label}>
                  Your name
                </label>
                <input
                  id="name-step"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={field}
                  required
                />
              </div>
              {error && <p className="text-sm text-error-600">{error}</p>}
              <button type="submit" disabled={customer.loading} className={`w-full ${button.brand} h-11`}>
                {customer.loading ? "Saving..." : "Continue"}
              </button>
            </form>
          )}
        </div>
      </div>

      <aside className="hidden flex-col justify-between bg-brand-950 p-12 text-white lg:flex">
        <BrandLogo light />
        <div>
          <p className="text-title-sm font-semibold tracking-tight">Your store, your orders, one place.</p>
          <p className="mt-3 max-w-sm text-theme-sm text-gray-400">
            A store link, an order pipeline and a message thread for every order. Built for Instagram and WhatsApp
            sellers.
          </p>
        </div>
        <p className="text-theme-xs text-gray-500">&copy; {new Date().getFullYear()} Order Desk</p>
      </aside>
    </div>
  );
}
