import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Camera, FileCode2, History, Network, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { EurekaMark } from "../brand/EurekaIdentity";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "signin") {
        await signIn(String(form.get("email") || ""), String(form.get("password") || ""));
      } else {
        const password = String(form.get("password") || "");
        if (password !== String(form.get("confirmPassword") || "")) throw new Error("The password confirmation does not match.");
        await signUp({ displayName: String(form.get("displayName") || ""), workspaceName: String(form.get("workspaceName") || ""), email: String(form.get("email") || ""), password });
        toast.success("Account created. A verification email was sent.");
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page">
    <motion.section className="auth-product" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="auth-brand"><EurekaMark className="eureka-mark--auth" /><strong>EurekaVault</strong></div>
      <div className="auth-product__copy"><span className="eyebrow">Version-controlled thinking</span><h1>Your prompts are work products. Treat them like source code.</h1><p>Build a private system of prompts, methods, and snapshots that preserves exactly how your working methodology evolves.</p></div>
      <div className="auth-preview" aria-hidden>
        <div className="auth-preview__sidebar"><span className="mini-brand">ε</span><i /><i /><i /><i /></div>
        <div className="auth-preview__main"><div className="auth-preview__top" /><div className="auth-preview__content"><span className="preview-path">Career / Backend Resume</span><strong>Backend CV Reviewer</strong><div className="preview-editor"><i /><i /><i /><i /><i /></div><div className="preview-history"><span>v12</span><i /><span>v11</span><i /><span>v10</span></div></div></div>
      </div>
      <div className="auth-proof"><span><FileCode2 size={16} /><strong>Automatic prompt history</strong></span><span><Camera size={16} /><strong>Global Versions</strong></span><span><Network size={16} /><strong>Direct hierarchy</strong></span><span><ShieldCheck size={16} /><strong>Private by default</strong></span></div>
    </motion.section>

    <motion.section className="auth-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}>
      <div className="auth-panel__mobile-brand"><EurekaMark className="eureka-mark--auth" /><strong>EurekaVault</strong></div>
      <div className="auth-panel__header"><span className="eyebrow">Personal workspace</span><h2>{mode === "signin" ? "Welcome back" : "Create your vault"}</h2><p>{mode === "signin" ? "Continue where your methodology left off." : "Start a private version-controlled knowledge workspace."}</p></div>
      <div className="auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" ? <><FormField label="Your name" required>{(props) => <input {...props} name="displayName" autoComplete="name" required />}</FormField><FormField label="Workspace name" required>{(props) => <input {...props} name="workspaceName" placeholder="My EurekaVault" required />}</FormField></> : null}
        <FormField label="Email address" required>{(props) => <input {...props} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />}</FormField>
        <FormField label="Password" required>{(props) => <input {...props} name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required />}</FormField>
        {mode === "signup" ? <FormField label="Confirm password" required>{(props) => <input {...props} name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required />}</FormField> : null}
        <Button variant="primary" size="lg" type="submit" loading={loading}>{mode === "signin" ? "Open EurekaVault" : "Create private vault"}</Button>
      </form>
      {mode === "signin" ? <button className="text-button" onClick={async () => { try { await resetPassword(email); toast.success("Password-reset email sent."); } catch (error) { toast.error(error instanceof Error ? error.message : "Reset email could not be sent."); } }}>Forgot your password?</button> : null}
      <div className="auth-privacy"><ShieldCheck size={15} /><span>Release 1 stores your content privately and does not send it to an AI provider.</span></div>
    </motion.section>
  </main>;
}
