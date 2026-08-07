import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Brain,
  BrainCircuit,
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  FileCode2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
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
  ["Mindset construction", "/mindset-construction", BrainCircuit, ""],
  ["Preferences", "/preferences", SlidersHorizontal, "preferences"],
  ["Versions", "/commits", Camera, ""],
  ["Decisions", "/decisions", BriefcaseBusiness, "decisions"],
] as const;

const secondaryNav = [
  ["Roadmap gates", "/roadmap", ArchiveRestore],
  ["Archive", "/archive", Archive],
  ["Settings", "/settings", Settings2],
] as const;

const mobilePrimary = [
  ["Home", "/dashboard", Home],
  ["Vault", "/hierarchy", Network],
  ["Prompts", "/prompts", FileCode2],
  ["Versions", "/commits", Camera],
] as const;

export function AppShell() {
  const { user, signOut, resendVerification } = useAuth();
  const { data, profile, connection } = useVault();
  const { mode, setMode, resolved } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const allNavigation = [...nav, ...secondaryNav];
  const pageTitle = allNavigation.find(([, path]) => location.pathname.startsWith(path))?.[0] || "IntellectVault";
  const mobileMoreActive = !mobilePrimary.some(([, path]) => location.pathname.startsWith(path));

  async function logout() {
    await signOut();
    toast.success("Signed out.");
  }

  const sidebar = (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar__top">
        <div className="brand">
          <span className="brand-mark"><Archive size={19} /></span>
          <div className="brand-copy"><strong>IntellectVault</strong><small>Private workspace</small></div>
        </div>
        <button
          className="sidebar-collapse"
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="workspace-chip" title={profile?.workspaceName || "Private workspace"}>
        <span>{profile?.workspaceName || "Private workspace"}</span>
        <Badge tone={connection === "connected" ? "success" : connection === "error" ? "danger" : "warning"}>
          {sidebarCollapsed ? "•" : connection}
        </Badge>
      </div>

      <nav className="nav-list" aria-label="Primary navigation">
        <span className="nav-label">Workspace</span>
        {nav.map(([label, path, Icon, collection]) => (
          <NavLink
            key={path}
            to={path}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) => cx("nav-link", isActive && "active")}
          >
            <Icon size={18} />
            <span>{label}</span>
            {collection ? <small>{activeRecords(data[collection] as Record<string, VaultRecord>).length}</small> : null}
          </NavLink>
        ))}
        <span className="nav-label">System</span>
        {secondaryNav.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) => cx("nav-link", isActive && "active")}
          >
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="theme-switcher" aria-label="Theme">
          <button aria-label="Use light theme" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}><Sun size={16} /></button>
          <button aria-label="Use system theme" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>Auto</button>
          <button aria-label="Use dark theme" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}><Moon size={16} /></button>
        </div>
        <span className="theme-caption">{resolved} appearance</span>
      </div>
    </aside>
  );

  return (
    <div className={cx("app-shell", sidebarCollapsed && "sidebar-collapsed")}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="desktop-sidebar">{sidebar}</div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="mobile-navigation-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="mobile-navigation-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="mobile-navigation-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 430, damping: 36 }}
            >
              <div className="mobile-sheet-handle" aria-hidden />
              <header className="mobile-navigation-header">
                <div><span>IntellectVault</span><strong>{profile?.workspaceName || "Private workspace"}</strong></div>
                <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={20} /></Button>
              </header>
              <nav className="mobile-navigation-grid" aria-label="All navigation">
                {allNavigation.map(([label, path, Icon]) => (
                  <NavLink key={path} to={path} className={({ isActive }) => cx("mobile-menu-link", isActive && "active")} onClick={() => setMobileOpen(false)}>
                    <span><Icon size={20} /></span><strong>{label}</strong>
                  </NavLink>
                ))}
              </nav>
              <div className="mobile-menu-footer">
                <div className="theme-switcher" aria-label="Theme">
                  <button aria-label="Use light theme" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}><Sun size={16} /></button>
                  <button aria-label="Use system theme" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>Auto</button>
                  <button aria-label="Use dark theme" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}><Moon size={16} /></button>
                </div>
                <button className="mobile-signout" onClick={logout}><LogOut size={18} /> Sign out</button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__title">
            <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div><span>{profile?.workspaceName || "IntellectVault"}</span><strong>{pageTitle}</strong></div>
          </div>
          <CommandPalette />
          <div className="user-menu-wrap">
            <button className="user-button" aria-expanded={userMenu} onClick={() => setUserMenu((value) => !value)}>
              <span>{(user?.displayName || user?.email || "U").slice(0, 1).toUpperCase()}</span>
              <div><strong>{user?.displayName || "Vault owner"}</strong><small>{user?.email}</small></div>
              <ChevronDown size={15} />
            </button>
            <AnimatePresence>
              {userMenu ? (
                <motion.div className="user-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  {!user?.emailVerified ? (
                    <button onClick={async () => { await resendVerification(); toast.success("Verification email sent."); setUserMenu(false); }}>Resend verification email</button>
                  ) : <div className="user-menu__verified">Email verified</div>}
                  <button onClick={logout}><LogOut size={16} /> Sign out</button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </header>

        {!user?.emailVerified ? (
          <div className="verification-banner">
            <span>Your email is not verified yet. Verification is recommended.</span>
            <Button size="sm" variant="ghost" onClick={async () => { await resendVerification(); toast.success("Verification email sent."); }}>Send again</Button>
          </div>
        ) : null}

        <motion.main
          id="main-content"
          className="page-container"
          key={location.pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Outlet />
        </motion.main>
      </div>

      <nav className="mobile-dock" aria-label="Mobile navigation">
        {mobilePrimary.map(([label, path, Icon]) => (
          <NavLink key={path} to={path} className={({ isActive }) => cx("mobile-dock-link", isActive && "active")}>
            <Icon size={20} /><span>{label}</span>
          </NavLink>
        ))}
        <button className={cx("mobile-dock-link", mobileMoreActive && "active")} onClick={() => setMobileOpen(true)} aria-label="More navigation">
          <MoreHorizontal size={21} /><span>More</span>
        </button>
      </nav>
    </div>
  );
}
