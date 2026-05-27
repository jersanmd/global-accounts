import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, ShieldCheck, Users, Headphones, Mail, Lock, Eye, EyeOff } from "lucide-react";

export function Login() {
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isSignUp && !agreedToTerms) { setError("You must agree to the Terms and Privacy Policy."); return; }
    setLoading(true);
    try {
      if (isSignUp) { await signUp(email, password); navigate("/setup-profile"); }
      else { await signIn(email, password); navigate("/dashboard"); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally { setLoading(false); }
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
                <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20"><Shield className="h-5 w-5 text-primary" /></div>
                  <span className="text-lg font-bold tracking-tight text-white">Global<span className="text-primary">Account</span></span>
                </Link>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white">Game Accounts, <span className="text-primary">Traded Safe</span></h2>
                <p className="text-sm leading-relaxed text-gray-400">Join the most secure gaming account marketplace. Every transaction protected by escrow and verified by a live middleman.</p>
                <div className="mt-10 space-y-4">
                  {[{ icon: ShieldCheck, label: "Escrow Protected Payments" }, { icon: Users, label: "Live Middleman Verification" }, { icon: Headphones, label: "24/7 Support" }].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="rounded-lg bg-white/8 p-1.5"><item.icon className="h-4 w-4 text-primary" /></div>{item.label}
                    </div>
                  ))}
                </div>
              </div>
              <p className="relative text-xs text-gray-600">&copy; 2026 GlobalAccount</p>
            </div>

            {/* Right — Form */}
            <div className="p-8 md:col-span-3 md:p-12">
              <div className="mx-auto max-w-sm">
                <div className="mb-8 flex items-center gap-2.5 md:hidden">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="text-lg font-bold tracking-tight text-gray-900">Global<span className="text-primary">Account</span></span>
                </div>
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

                <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400">or continue with</span></div></div>

                <button onClick={() => signInWithGoogle()} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50">
                  <GoogleIcon className="h-4.5 w-4.5" />Google
                </button>

                <p className="mt-6 text-center text-sm text-gray-500">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); }} className="font-semibold text-primary hover:underline">{isSignUp ? "Sign In" : "Sign Up"}</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-8">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="text-base font-bold tracking-tight text-gray-900">Global<span className="text-primary">Account</span></span></div>
          <div className="mb-3 flex items-center justify-center gap-6 text-xs text-gray-400">
            <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 GlobalAccount.</p>
        </div>
      </footer>
    </>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
