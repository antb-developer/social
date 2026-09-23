import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { button } from "../lib/ui";

const FEATURES = [
  {
    title: "One link for your store",
    body: "Share a single link on Instagram and WhatsApp. Customers browse, pick and order without the \"price?\" DMs.",
    icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  },
  {
    title: "Orders in a pipeline",
    body: "New, pending payment, paid, shipped, delivered. Every order sits in one clear stage instead of a chat scroll.",
    icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
  },
  {
    title: "UPI payment, verified",
    body: "Send a UPI request with the exact total. Customers upload proof with a UTR and you approve it in one tap.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
];

const STEPS = [
  { title: "Share your store link", body: "Sign up, add your products and paste your link in your Instagram bio." },
  { title: "Customers place orders", body: "They log in with their mobile number and order. Each order gets its own thread." },
  { title: "Confirm payment and ship", body: "Review the payment proof, update the status and share it on WhatsApp." },
];

export function HomePage() {
  return (
    <div className="scroll-smooth">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <BrandLogo />
          <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-gray-900">
              How it works
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className={button.ghost}>
              Log in
            </Link>
            <Link to="/signup" className={button.brand}>
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="bg-gradient-to-b from-brand-25 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-2">
            <div>
              <h1 className="text-title-sm font-semibold tracking-tight text-gray-900 sm:text-title-md">
                Stop tracking orders by scrolling chats.
              </h1>
              <p className="mt-4 max-w-lg text-base text-gray-600">
                Order Desk gives your Instagram and WhatsApp store a shareable link, an order pipeline and a message
                thread for every order.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup?role=store" className={`${button.brand} px-5 py-3`}>
                  Create your store
                </Link>
                <Link to="/login?role=customer" className={`${button.secondary} px-5 py-3`}>
                  Track my orders
                </Link>
              </div>
            </div>

            <div aria-hidden className="mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-sm font-semibold text-gray-900">ORD-1024</span>
                <span className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700">
                  Pending payment
                </span>
              </div>
              <div className="space-y-3 py-4 text-sm">
                <p className="max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-gray-800">
                  Is the blue kurta available in M?
                </p>
                <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500 px-3 py-2 text-white">
                  Yes! Sending payment details.
                </p>
                <div className="ml-auto max-w-[80%] rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Payment request</p>
                  <p className="text-lg font-semibold text-gray-900">₹1,499</p>
                  <p className="mt-1 rounded-lg bg-brand-50 py-1.5 text-center text-xs font-medium text-brand-600">
                    Pay with UPI app
                  </p>
                </div>
                <p className="w-fit rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700">
                  Proof uploaded
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-900">
            Everything a small seller needs
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-900">How it works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <Link to="/signup?role=store" className={`${button.brand} px-5 py-3`}>
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row">
          <BrandLogo />
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-gray-900">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-gray-900">
              Sign up
            </Link>
            <Link to="/account" className="hover:text-gray-900">
              My account
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Order Desk</p>
        </div>
      </footer>
    </div>
  );
}
