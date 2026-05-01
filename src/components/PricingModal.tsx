import { useEffect, useState } from "react";
import { Zap, Check, Loader2, CreditCard, Crown, MapPin, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { openRazorpayCheckout, setUnlocked, isUnlocked } from "@/lib/razorpay";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInRequired: () => void;
  onUnlocked?: () => void;
}

type Currency = "INR" | "USD";

const PRO_FEATURES = [
  "Unlimited generations per day",
  "All tools — captions, bios, replies, WhatsApp",
  "Personal & business modes",
  "Photo caption with AI vision",
  "Poster generator",
  "All Indian languages",
];

async function detectCurrency(): Promise<Currency> {
  try {
    const resp = await fetch("https://ipapi.co/json/");
    if (!resp.ok) return "INR";
    const data = await resp.json();
    return data?.country === "IN" ? "INR" : "USD";
  } catch {
    return "INR";
  }
}

export const PricingModal = ({ open, onOpenChange, onSignInRequired, onUnlocked }: Props) => {
  const { user } = useAuth();
  const [userCurrency, setUserCurrency] = useState<Currency>("INR");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [paying, setPaying] = useState(false);
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false);

  // Detect currency when modal opens
  useEffect(() => {
    if (!open) return;
    setAlreadyUnlocked(isUnlocked());
    setDetectingLocation(true);
    detectCurrency()
      .then((c) => setUserCurrency(c))
      .finally(() => setDetectingLocation(false));
  }, [open]);

  const handleRazorpay = async () => {
    setPaying(true);
    try {
      await openRazorpayCheckout({
        amount: 19900,           // ₹199 in paise
        currency: "INR",
        name: "WriteRight",
        description: "Lifetime Access — Unlimited AI generations",
        prefillEmail: user?.email,
        prefillName: user?.user_metadata?.full_name,
        onSuccess: (paymentId) => {
          setUnlocked();
          setAlreadyUnlocked(true);
          toast.success("Payment successful! You now have unlimited access 🎉");
          onUnlocked?.();
          onOpenChange(false);
          console.log("Razorpay payment ID:", paymentId);
        },
        onDismiss: () => {
          setPaying(false);
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Crown className="h-5 w-5 text-primary" />
            {alreadyUnlocked ? "You have full access!" : "Unlock WriteRight"}
          </DialogTitle>
          <DialogDescription>
            {alreadyUnlocked
              ? "You've already unlocked lifetime access. Enjoy unlimited generations!"
              : "Free plan: 3 generations/day. Unlock once for unlimited access forever."}
          </DialogDescription>
        </DialogHeader>

        {/* Already unlocked state */}
        {alreadyUnlocked ? (
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5 text-center">
            <Unlock className="mx-auto mb-2 h-8 w-8 text-accent" />
            <p className="font-semibold">Lifetime access active</p>
            <p className="mt-1 text-sm text-muted-foreground">Generate as much as you want, every day.</p>
            <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>Start generating</Button>
          </div>
        ) : (
          <>
            {/* Features */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                <Zap className="h-4 w-4 text-primary" /> Everything you get
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Currency indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {detectingLocation ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Detecting your location…
                </span>
              ) : (
                <span>
                  Showing prices for <strong>{userCurrency}</strong>
                  {" · "}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setUserCurrency(userCurrency === "INR" ? "USD" : "INR")}
                  >
                    Switch to {userCurrency === "INR" ? "USD ($9)" : "INR (₹199)"}
                  </button>
                </span>
              )}
            </div>

            {/* Payment button */}
            {userCurrency === "INR" ? (
              /* Indian users — Razorpay */
              <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-center">
                <p className="text-4xl font-extrabold">₹199</p>
                <p className="mt-1 text-sm text-muted-foreground">One-time payment · Lifetime access</p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-4 w-full gap-2 text-base"
                  disabled={paying || detectingLocation}
                  onClick={handleRazorpay}
                >
                  {paying ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Opening payment…</>
                  ) : (
                    <><Unlock className="h-5 w-5" /> Unlock for ₹199</>
                  )}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Secure payment via Razorpay · UPI, cards, netbanking</p>
              </div>
            ) : (
              /* International users — Stripe */
              <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-center">
                <p className="text-4xl font-extrabold">$9</p>
                <p className="mt-1 text-sm text-muted-foreground">One-time payment · Lifetime access</p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-4 w-full gap-2 text-base"
                  disabled={detectingLocation}
                  onClick={() => {
                    if (!user) { onOpenChange(false); onSignInRequired(); return; }
                    toast.info("Stripe checkout coming soon. Please use INR for now.");
                  }}
                >
                  <CreditCard className="h-5 w-5" /> Unlock for $9
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Secure payment via Stripe</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
