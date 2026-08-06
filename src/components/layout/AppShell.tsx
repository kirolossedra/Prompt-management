import { useState } from "react";
import { Archive, ArchiveRestore, Brain, BriefcaseBusiness, ChevronDown, FileCode2, GitCommitHorizontal, LayoutDashboard, LogOut, Menu, Moon, Network, Settings2, SlidersHorizontal, Sun, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";
import { useTheme } from "../../hooks/useTheme";
import { activeRecords, cx } from "../../lib/utils";
import type { VaultRecord } from "../../types/domain";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { CommandPalette } from "./CommandPalette";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard, ""],
  ["Hierarchy", "/hierarchy", Network, "endeavors"],
  ["Prompts", "/prompts", FileCode2, "prompts"],
  ["Mindsets", "/mindsets", Brain, "mindsets"],
  ["Preferences", "/preferences", SlidersHorizontal, "preferences"],
  ["Commits", "/commits", GitCommitHorizontal, ""],
  ["Decisions", "/decisions", BriefcaseBusiness, "decisions"],
] as const;

const secondaryNav = [
  ["Roadmap gates", "/roadmap", ArchiveRestore],
  ["Archive", "/archive", Archive],
  ["Settings", "/settings", Settings2],
] as const;

export function AppShell() {
  const { user, signOut, resendVerification } = useAuth();
  const { data, profile, connection } = useVault();
  const { mode, setMode, resolved } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const pageTitle = [...nav, ...secondaryNav].find(([, path]) => location.pathname.startsWith(path))?.[0] || "IntellectVault";

  async function logout() {
    await signOut();
    toast.success("Signed out.");
  }

  const sidebar = <aside className="sidebar">
    <div className="sidebar__top">
      <div className="brand"><span className="brand-mark"><Archive size={20} /></span><div><strong>IntellectVault</strong><small>Manual-first R1</small></div></div>
      <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
    </div>
    <div className="workspace-chip"><span>{profile?.workspaceName || "Private workspace"}</span><Badge tone={connection === "connected" ? "success" : connection === "error" ? "danger" : "warning"}>{connection}</Badge></div>
    <nav className="nav-list" aria-label="Primary navigation">
      <span className="nav-label">Workspace</span>
      {nav.map(([label, path, Icon, collection]) => <NavLink key={path} to={path} className={({ isActive }) => cx("nav-link", isActive && "active")} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{label}</span>{collection ? <small>{activeRecords(data[collection] as Record<string, VaultRecord>).length}</small> : null}</NavLink>)}
      <span className="nav-label">System</span>
      {secondaryNav.map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => cx("nav-link", isActive && "active")} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}
    </nav>
    <div className="sidebar__footer">
      <div className="theme-switcher" aria-label="Theme">
        <button aria-label="Use light theme" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}><Sun size={16} /></button>
        <button aria-label="Use system theme" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>Auto</button>
        <button aria-label="Use dark theme" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}><Moon size={16} /></button>
      </div>
      <span className="theme-caption">{resolved} appearance</span>
    </div>
  </aside>;

  return <div className="app-shell">
    <div className="desktop-sidebar">{sidebar}</div>
    <AnimatePresence>{mobileOpen ? <motion.div className="mobile-sidebar-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="mobile-sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />{sidebar}</motion.div> : null}</AnimatePresence>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar__title"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div><span>{profile?.workspaceName || "IntellectVault"}</span><strong>{pageTitle}</strong></div></div>
        <CommandPalette />
        <div className="user-menu-wrap">
          <button className="user-button" onClick={() => setUserMenu((value) => !value)}><span>{(user?.displayName || user?.email || "U").slice(0, 1).toUpperCase()}</span><div><strong>{user?.displayName || "Vault owner"}</strong><small>{user?.email}</small></div><ChevronDown size={15} /></button>
          <AnimatePresence>{userMenu ? <motion.div className="user-menu" initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            {!user?.emailVerified ? <button onClick={async () => { await resendVerification(); toast.success("Verification email sent."); setUserMenu(false); }}>Resend verification email</button> : <div className="user-menu__verified">Email verified</div>}
            <button onClick={logout}><LogOut size={16} /> Sign out</button>
          </motion.div> : null}</AnimatePresence>
        </div>
      </header>
      {!user?.emailVerified ? <div className="verification-banner"><span>Your email is not verified yet. Your workspace remains accessible, but verification is recommended.</span><Button size="sm" variant="ghost" onClick={async () => { await resendVerification(); toast.success("Verification email sent."); }}>Send again</Button></div> : null}
      <motion.main className="page-container" key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}><Outlet /></motion.main>
    </div>
  </div>;
}
