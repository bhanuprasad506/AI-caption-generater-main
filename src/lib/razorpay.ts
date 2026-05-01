// Razorpay integration — loads script on demand, opens checkout popup

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;          // in paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayInstance {
  open(): void;
  close(): void;
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const UNLOCK_KEY = "writeright.unlocked";

// Load Razorpay script dynamically — only once
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
}

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function setUnlocked(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, "true");
  } catch { /* ignore */ }
}

export interface RazorpayCheckoutOptions {
  amount: number;          // paise
  currency?: string;
  name?: string;
  description?: string;
  prefillEmail?: string;
  prefillName?: string;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions): Promise<void> {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId || keyId === "paste_your_razorpay_key_id_here") {
    throw new Error("Razorpay key not configured. Add VITE_RAZORPAY_KEY_ID to your .env file.");
  }

  await loadRazorpayScript();

  const rzp = new window.Razorpay({
    key: keyId,
    amount: opts.amount,
    currency: opts.currency ?? "INR",
    name: opts.name ?? "WriteRight",
    description: opts.description ?? "Unlock full access",
    theme: { color: "#f97316" },   // matches app's primary orange
    prefill: {
      name: opts.prefillName,
      email: opts.prefillEmail,
    },
    handler: (response) => {
      opts.onSuccess(response.razorpay_payment_id);
    },
    modal: {
      ondismiss: () => {
        opts.onDismiss?.();
      },
    },
  });

  rzp.open();
}
