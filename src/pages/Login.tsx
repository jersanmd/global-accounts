import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Users, Headphones, Mail, Lock, Eye, EyeOff, CheckCircle, ArrowRight, User, ShoppingBag, Star } from "lucide-react";

export function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isSignUp && !agreedToTerms) { setError("You must agree to the Terms and Privacy Policy."); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            navigate("/setup-profile");
          } else {
            setShowOnboarding(true);
          }
        }, 500);
      } else {
        await signIn(email, password);
        navigate("/setup-profile");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (msg.includes("rate limit") || msg.includes("rate_limit")) {
        setError("Email rate limit reached. Please wait a moment or use the resend button below.");
        setShowOnboarding(true);
      } else if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("This email is already registered. Check your inbox or resend below.");
        setShowOnboarding(true);
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  const handleResendConfirmation = async () => {
    setResending(true);
    setError("");
    try {
      // Try proper resend first
      const { error } = await supabase.auth.resend({ type: "signup", email } as any);
      if (error) {
        // Fallback: use signInWithOtp which always sends an email
        const { error: otpError } = await supabase.auth.signInWithOtp({ email });
        if (otpError) throw otpError;
      }
      alert("Confirmation email sent! Check your inbox and spam folder.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg.includes("rate") ? "Please wait 60 seconds before trying again." : msg);
    } finally { setResending(false); }
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="grid md:grid-cols-5">
            
            {/* Left — Brand Panel */}
            <div className="relative hidden overflow-hidden bg-dark p-10 md:col-span-2 md:flex md:flex-col md:justify-between">
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white">Game Accounts <span className="text-gray-500">&amp;</span> Items, <span className="text-primary">Traded Safe</span></h2>
                <p className="text-sm leading-relaxed text-gray-400">Join the most secure gaming account marketplace. Every transaction protected by escrow and verified by a live middleman.</p>
                <div className="mt-10 space-y-4">
                  {[{ icon: ShieldCheck, label: "Escrow Protected Payments" }, { icon: Users, label: "Live Middleman Verification" }, { icon: Headphones, label: "24/7 Support" }].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="rounded-lg bg-white/8 p-1.5"><item.icon className="h-4 w-4 text-primary" /></div>{item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Form / Onboarding */}
            <div className="p-8 md:col-span-3 md:p-12">
              <div className="mx-auto max-w-sm">
                {showOnboarding ? (
                  /* ─── Post-Signup Onboarding ─── */
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Account Created!</h1>
                    <p className="mt-2 text-sm text-gray-500">
                      Check your inbox — we sent a confirmation link to <span className="font-semibold text-gray-700">{email}</span>.
                    </p>

                    {/* Steps */}
                    <div className="mt-8 space-y-4 text-left">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">What happens next</p>
                      {[
                        { step: 1, icon: Mail, title: "Confirm your email", desc: "Click the link in the email we just sent. Check spam if you don't see it." },
                        { step: 2, icon: User, title: "Set up your profile", desc: "Add your display name, Discord, and upload an avatar." },
                        { step: 3, icon: ShoppingBag, title: "Browse & buy accounts", desc: "Find gaming accounts across all platforms with escrow protection." },
                        { step: 4, icon: Star, title: "Sell your accounts", desc: "List your gaming accounts and earn. Middleman verified, escrow secured." },
                      ].map(({ step, icon: Icon, title, desc }) => (
                        <div key={step} className="flex gap-3 rounded-xl bg-gray-50 p-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{step}</div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{title}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">Tip:</span> After confirming, sign in to set up your profile and start browsing accounts right away.
                      </p>
                    </div>

                    <button
                      onClick={() => { setShowOnboarding(false); setIsSignUp(false); }}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                    >
                      Go to Sign In
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resending}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50"
                    >
                      {resending ? "Sending..." : "Resend confirmation email"}
                    </button>
                  </div>
                ) : (
                  <>
                <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-gray-900">{isSignUp ? "Create your account" : "Welcome back"}</h1>
                <p className="mb-8 text-sm text-gray-500">{isSignUp ? "Start trading gaming accounts securely." : "Sign in to your account to continue."}</p>

                {error && (
                  <div className={`mb-4 rounded-xl p-3 text-sm ${error.includes("confirmation") || error.includes("Check your email") ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-10 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>

                  {isSignUp && (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs text-gray-500">
                        I agree to the{" "}
                        <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>
                        {" "}and{" "}
                        <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>
                      </span>
                    </label>
                  )}

                  <button type="submit" disabled={loading} className="btn-shine w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50">
                    {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="font-semibold text-primary hover:underline">{isSignUp ? "Sign In" : "Sign Up"}</button>
                </p>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
