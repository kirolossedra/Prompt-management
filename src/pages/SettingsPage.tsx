import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Cloud, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { PageHeader } from "../components/ui/PageHeader";

const rules = `"intellectVault": {
  "users": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    }
  }
}`;

export function SettingsPage() {
  const { user, resendVerification } = useAuth();
  const { profile, connection, saveProfile, exportWorkspace, data } = useVault();
  const [workspaceName, setWorkspaceName] = useState(profile?.workspaceName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => setWorkspaceName(profile?.workspaceName || ""), [profile?.workspaceName]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveProfile({ workspaceName });
      toast.success("Workspace settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const recordCount = Object.values(data).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
  const checks = [
    [connection === "connected", "Realtime Database connection", connection],
    [Boolean(user), "Firebase Authentication session", user?.email || "Not signed in"],
    [Boolean(user?.emailVerified), "Email verification", user?.emailVerified ? "Verified" : "Not verified"],
    [Boolean(profile), "Workspace profile", profile?.workspaceName || "Missing"],
  ] as const;

  return <>
    <PageHeader eyebrow="Workspace administration" title="Settings & diagnostics" description="Manage the private workspace profile, export a JSON backup, and verify Firebase setup requirements." actions={<Button icon={<Download size={17} />} onClick={exportWorkspace}>Export workspace JSON</Button>} />
    <div className="settings-grid">
      <Card className="settings-card"><div className="card-header"><div><span className="eyebrow">Profile</span><h2>Workspace identity</h2></div></div><form onSubmit={save}><FormField label="Workspace name" required>{(props) => <input {...props} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required />}</FormField><FormField label="Owner email">{(props) => <input {...props} value={user?.email || ""} disabled />}</FormField><Button type="submit" variant="primary" loading={saving}>Save changes</Button></form></Card>
      <Card className="settings-card"><div className="card-header"><div><span className="eyebrow">Connection</span><h2>Diagnostics</h2></div><Cloud /></div><div className="diagnostic-list">{checks.map(([passed, label, helper]) => <div key={label}>{passed ? <CheckCircle2 className="success-icon" /> : <TriangleAlert className="warning-icon" />}<span><strong>{label}</strong><small>{helper}</small></span></div>)}</div><div className="metric-row"><div><strong>{recordCount}</strong><small>Total stored records</small></div><div><strong>{connection}</strong><small>Listener state</small></div></div>{!user?.emailVerified ? <Button variant="secondary" onClick={async () => { await resendVerification(); toast.success("Verification email sent."); }}>Resend verification</Button> : null}</Card>
      <Card className="settings-card settings-card--wide"><div className="card-header"><div><span className="eyebrow">Server-side enforcement</span><h2>Required Realtime Database rules</h2></div><ShieldCheck /></div><p className="muted-copy">The public Firebase web configuration identifies the project; these server-side rules enforce owner-only access. Merge the included <code>database.rules.json</code> with the existing project rules.</p><pre className="code-block">{rules}</pre></Card>
      <Card className="settings-card settings-card--wide"><div className="card-header"><div><span className="eyebrow">Data portability</span><h2>Manual backup</h2></div><Download /></div><p className="muted-copy">Export produces a local JSON snapshot of the current profile and every collection. Import/migration adapters remain outside the approved Release 1 scope.</p><Button onClick={exportWorkspace}>Download JSON snapshot</Button></Card>
    </div>
  </>;
}
