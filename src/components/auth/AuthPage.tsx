import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Archive, GitCommitHorizontal, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
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
        if (password !== String(form.get("confirmPassword") || "")) {
          throw new Error("The password confirmation does not match.");
        }
        await signUp({
          displayName: String(form.get("displayName") || ""),
          workspaceName: String(form.get("workspaceName") || ""),
          email: String(form.get("email") || ""),
          password,
        });
        toast.success("Account created. A verification email was sent.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <motion.section
        className="auth-hero"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="brand brand--large"><span className="brand-mark"><Archive size={24} /></span><span>IntellectVault</span></div>
        <div className="auth-hero__copy">
          <div className="release-pill"><Sparkles size={14} /> Manual-first Release 1</div>
          <h1>Preserve how your thinking evolves.</h1>
          <p>Organize prompts, methodologies, preferences, and commit history in one private, version-controlled workspace—without sending your content to an AI model.</p>
        </div>
        <div className="auth-features">
          <div><Layers3 /><strong>Flexible hierarchy</strong><span>Direct Endeavor → Task → Prompt organization.</span></div>
          <div><GitCommitHorizontal /><strong>Meaningful history</strong><span>Local and global commits with manual evolution summaries.</span></div>
          <div><ShieldCheck /><strong>Private by default</strong><span>Owner-scoped Firebase workspace rules.</span></div>
        </div>
      </motion.section>

      <motion.section
        className="auth-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.08 }}
      >
        <div className="auth-panel__header">
          <span className="eyebrow">Your workspace</span>
          <h2>{mode === "signin" ? "Welcome back" : "Create your vault"}</h2>
          <p>{mode === "signin" ? "Sign in to continue your methodology history." : "Start with a private manual-first workspace."}</p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" ? <>
            <FormField label="Your name" required>{(props) => <input {...props} name="displayName" autoComplete="name" required />}</FormField>
            <FormField label="Workspace name" required hint="Example: Kirolos's IntellectVault">{(props) => <input {...props} name="workspaceName" required />}</FormField>
          </> : null}
          <FormField label="Email address" required>{(props) => <input {...props} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />}</FormField>
          <FormField label="Password" required hint={mode === "signup" ? "Use at least six characters; stronger is recommended." : undefined}>{(props) => <input {...props} name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required />}</FormField>
          {mode === "signup" ? <FormField label="Confirm password" required>{(props) => <input {...props} name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required />}</FormField> : null}
          <Button variant="primary" size="lg" type="submit" loading={loading}>{mode === "signin" ? "Open vault" : "Create private workspace"}</Button>
        </form>
        {mode === "signin" ? <button className="text-button" onClick={async () => {
          try {
            await resetPassword(email);
            toast.success("Password-reset email sent.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The reset email could not be sent.");
          }
        }}>Forgot your password?</button> : null}
        <div className="auth-privacy"><ShieldCheck size={16} /><span>Release 1 never executes prompts or sends stored content to an external AI provider.</span></div>
      </motion.section>
    </main>
  );
}
