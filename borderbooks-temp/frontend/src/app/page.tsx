"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      await signUp.create({
        emailAddress,
        password,
        unsafeMetadata: {
          contactNumber,
        },
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || "An error occurred during sign up.");
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status !== 'complete') {
        setError("Unable to complete verification.");
      }
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/app");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || "Incorrect verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col md:flex-row bg-[#030712] text-white overflow-hidden selection:bg-[#176b4d] selection:text-white">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#176b4d] opacity-20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0a3a2a] opacity-30 blur-[150px] rounded-full mix-blend-screen pointer-events-none"></div>

      {/* Left side: Grand Branding */}
      <div className="relative flex-1 flex flex-col p-10 md:p-20 justify-between z-10 border-b md:border-b-0 md:border-r border-white/5">
        <header className="flex items-center gap-3 mb-16 animate-fade-in-down">
          <div className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg shadow-[#176b4d]/20 backdrop-blur-md">
            <Sparkles className="text-[#10b981] w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight font-serif text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">BorderBooks</span>
        </header>

        <section className="max-w-2xl my-auto animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176b4d]/10 border border-[#176b4d]/20 text-[#10b981] text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
            </span>
            Next-Gen Reconciliation
          </div>
          <h1 className="text-6xl md:text-7xl font-serif font-medium leading-[1.1] tracking-tight mb-8">
            Match invoices with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#34d399]">absolute precision.</span>
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed mb-12 font-light">
            Deterministically match uploaded invoice and bank files, backed by an immutable audit trail that shows exactly why every pair was proposed.
          </p>

          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-2"><span className="text-[#10b981]">✦</span> Never moves money</span>
            <span className="flex items-center gap-2"><span className="text-[#10b981]">✦</span> Not accounting advice</span>
            <span className="flex items-center gap-2"><span className="text-[#10b981]">✦</span> No bank scraping</span>
            <span className="flex items-center gap-2"><span className="text-[#10b981]">✦</span> Absolute privacy</span>
          </div>
        </section>
      </div>

      {/* Right side: Glassmorphic Sign up form */}
      <div className="relative flex-1 flex items-center justify-center p-8 md:p-16 z-10">
        <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-2xl p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
          
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

          {!pendingVerification && (
            <>
              <div className="text-center mb-10 relative">
                <h2 className="text-3xl font-serif font-medium mb-3 text-white">Join the Elite</h2>
                <p className="text-sm text-slate-400">Step into the future of financial operations</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 relative z-20">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                </div>
              )}

              <form className="flex flex-col gap-6 relative z-20" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="you@company.com" 
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="h-12 px-5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 px-5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="h-12 px-5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="mt-6 h-14 bg-gradient-to-r from-[#176b4d] to-[#0a3a2a] hover:from-[#10b981] hover:to-[#176b4d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-3 font-bold text-[15px] shadow-[0_0_20px_rgba(23,107,77,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enter BorderBooks <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}

          {pendingVerification && (
            <>
              <div className="text-center mb-10 relative">
                <div className="mx-auto w-12 h-12 bg-[#176b4d]/20 border border-[#176b4d]/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
                </div>
                <h2 className="text-3xl font-serif font-medium mb-3 text-white">Verify Email</h2>
                <p className="text-sm text-slate-400">We sent a verification code to <span className="text-white font-medium">{emailAddress}</span></p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 relative z-20">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 leading-relaxed">{error}</p>
                </div>
              )}

              <form className="flex flex-col gap-6 relative z-20" onSubmit={onPressVerify}>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Verification Code</label>
                  <input 
                    type="text" 
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-12 px-5 text-center tracking-[0.25em] text-lg bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="mt-6 h-14 bg-gradient-to-r from-[#176b4d] to-[#0a3a2a] hover:from-[#10b981] hover:to-[#176b4d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-3 font-bold text-[15px] shadow-[0_0_20px_rgba(23,107,77,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Complete <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center text-xs text-slate-400 relative z-20">
            Already a member? <Link href="/app" className="text-[#10b981] font-bold hover:underline ml-1 tracking-wide">Sign in to workspace</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

