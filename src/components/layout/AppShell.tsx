import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Share2,
  Sparkles,
  WandSparkles,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Tooltip } from "radix-ui";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";
import { useTheme } from "../../hooks/useTheme";
import { activeRecords, cx } from "../../lib/utils";
import type { VaultRecord } from "../../types/domain";
import { Button } from "../ui/Button";
import { CommandPalette } from "./CommandPalette";

const workspaceNav = [
  ["Overview", "/dashboard", LayoutDashboard, ""],
  ["Achievements", "/achievements", Trophy, ""],
  ["Vault", "/hierarchy", Network, "endeavors"],
  ["Prompts", "/prompts", FileCode2, "prompts"],
  ["Relationships", "/relationships", Share2, ""],
  ["Mindsets", "/mindsets", Brain, "mindsets"],
  ["Mindset builder", "/mindset-construction", BrainCircuit, ""],
  ["Preferences", "/preferences", SlidersHorizontal, "preferences"],
] as const;

const aiNav = [
  ["Find Prompt", "/ai/find-prompt", Sparkles, ""],
  ["Repurpose Prompt", "/ai/repurpose-prompt", WandSparkles, ""],
] as const;

const historyNav = [
  ["Global Versions", "/versions", Camera, "globalCommits"],
  ["Decisions", "/decisions", BriefcaseBusiness, "decisions"],
  ["Archive", "/archive", Archive, ""],
] as const;

const systemNav = [
  ["Roadmap gates", "/roadmap", ArchiveRestore, ""],
  ["Settings", "/settings", Settings2, ""],
] as const;

const mobilePrimary = [
  ["Home", "/dashboard", Home],
  ["Vault", "/hierarchy", Network],
  ["Prompts", "/prompts", FileCode2],
  ["Versions", "/versions", Camera],
] as const;

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

export function AppShell() {
  const { user, signOut, resendVerification } = useAuth();
  const { data, profile, connection } = useVault();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("iv-sidebar-width") || 260));
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.max(220, Math.min(360, event.clientX));
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove("resizing-sidebar");
      localStorage.setItem("iv-sidebar-width", String(sidebarWidth));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [sidebarWidth]);

  const breadcrumb = useMemo(() => {
    const promptMatch = location.pathname.match(/^\/prompts\/([^/]+)/);
    if (promptMatch) {
      const prompt = data.prompts[promptMatch[1]];
      const task = prompt ? data.tasks[prompt.taskId] : undefined;
      const endeavor = task ? data.endeavors[task.endeavorId] : undefined;
      return [endeavor?.name, task?.name, prompt?.title].filter(Boolean) as string[];
    }
    const entries = [...workspaceNav, ...aiNav, ...historyNav, ...systemNav];
    const current = entries.find(([, path]) => location.pathname === path || location.pathname.startsWith(`${path}/`));
    return [profile?.workspaceName || "Personal Vault", current?.[0] || "IntellectVault"];
  }, [data.endeavors, data.prompts, data.tasks, location.pathname, profile?.workspaceName]);

  const groups = [
    ["Workspace", workspaceNav],
    ["AI", aiNav],
    ["History", historyNav],
    ["System", systemNav],
  ] as const;

  async function logout() {
    await signOut();
    toast.success("Signed out.");
  }

  const mobileMoreActive = !mobilePrimary.some(([, path]) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const isPromptWorkspace = /^\/prompts\/[^/]+/.test(location.pathname);

  return (
    <div className={cx("app-shell", sidebarHidden && "sidebar-hidden")} style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="sidebar__brand-row">
          <button className="workspace-switcher" onClick={() => navigate("/dashboard")}>
            <span className="brand-mark">IV</span>
            <span className="workspace-switcher__copy"><strong>IntellectVault</strong><small>{profile?.workspaceName || "Personal Vault"}</small></span>
            <ChevronDown size={14} />
          </button>
          <Tooltip.Root>
            <Tooltip.Trigger asChild><button className="icon-button sidebar-hide" aria-label="Hide sidebar" onClick={() => setSidebarHidden(true)}><PanelLeftClose size={17} /></button></Tooltip.Trigger>
            <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={8}>Hide sidebar</Tooltip.Content></Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <div className="sidebar__status"><span className={cx("connection-dot", `connection-dot--${connection}`)} /><span>{connection === "connected" ? "Synced with Firebase" : connection}</span></div>

        <nav className="nav-groups">
          {groups.map(([groupLabel, items]) => (
            <section className="nav-group" key={groupLabel}>
              <span className="nav-group__label">{groupLabel}</span>
              {items.map(([label, path, Icon, collection]) => (
                <NavLink key={path} to={path} className={({ isActive }) => cx("nav-link", isActive && "active") }>
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  {collection ? <small>{activeRecords(data[collection] as Record<string, VaultRecord>).length}</small> : null}
                </NavLink>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="theme-switcher" aria-label="Theme">
            <button aria-label="Light theme" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}><Sun size={15} /></button>
            <button aria-label="System theme" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>Auto</button>
            <button aria-label="Dark theme" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}><Moon size={15} /></button>
          </div>
        </div>
        <button
          className="sidebar-resizer"
          aria-label="Resize sidebar"
          onPointerDown={(event) => {
            event.preventDefault();
            dragging.current = true;
            document.body.classList.add("resizing-sidebar");
          }}
        />
      </aside>

      {sidebarHidden ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild><button className="sidebar-reveal" aria-label="Show sidebar" onClick={() => setSidebarHidden(false)}><PanelLeftOpen size={18} /></button></Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={8}>Show sidebar</Tooltip.Content></Tooltip.Portal>
        </Tooltip.Root>
      ) : null}

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="mobile-navigation-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="mobile-navigation-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
            <motion.aside className="mobile-navigation-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 430, damping: 38 }}>
              <div className="sheet-handle" />
              <header className="mobile-sheet-header"><div><span>Personal workspace</span><strong>{profile?.workspaceName || "IntellectVault"}</strong></div><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close"><X size={19} /></Button></header>
              <div className="mobile-navigation-groups">
                {groups.map(([label, items]) => <section key={label}><span>{label}</span>{items.map((item) => { const [itemLabel, path, Icon] = item; return <NavLink key={path} to={path} onClick={() => setMobileOpen(false)} className={({ isActive }) => cx("mobile-menu-link", isActive && "active")}><Icon size={19} /><strong>{itemLabel}</strong></NavLink>; })}</section>)}
              </div>
              <button className="mobile-signout" onClick={logout}><LogOut size={17} /> Sign out</button>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__leading">
            <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumbs" aria-label="Breadcrumb">
              {breadcrumb.map((part, index) => <span key={`${part}-${index}`} className={index === breadcrumb.length - 1 ? "current" : ""}>{part}</span>)}
            </div>
          </div>
          <CommandPalette />
          <div className="topbar__actions">
            <Tooltip.Root>
              <Tooltip.Trigger asChild><button className="topbar-search-mobile" aria-label="Search" onClick={() => window.dispatchEvent(new CustomEvent("iv-open-command"))}><Search size={19} /></button></Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Content className="tooltip-content">Search</Tooltip.Content></Tooltip.Portal>
            </Tooltip.Root>
            <div className="user-menu-wrap">
              <button className="user-button" aria-expanded={userMenu} onClick={() => setUserMenu((value) => !value)}>
                <span>{initials(user?.displayName || user?.email || "U")}</span>
                <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {userMenu ? <motion.div className="user-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <div className="user-menu__identity"><strong>{user?.displayName || "Vault owner"}</strong><small>{user?.email}</small></div>
                  {!user?.emailVerified ? <button onClick={async () => { await resendVerification(); toast.success("Verification email sent."); setUserMenu(false); }}>Resend verification email</button> : <div className="user-menu__verified">Email verified</div>}
                  <button onClick={logout}><LogOut size={15} /> Sign out</button>
                </motion.div> : null}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {!user?.emailVerified ? <div className="verification-banner"><span>Your email is not verified.</span><button onClick={async () => { await resendVerification(); toast.success("Verification email sent."); }}>Send verification</button></div> : null}

        <AnimatePresence mode="wait">
          <motion.main id="main-content" className="page-container" key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {!isPromptWorkspace ? <nav className="mobile-dock" aria-label="Primary mobile navigation">
        {mobilePrimary.map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => cx("mobile-dock-link", isActive && "active")}><Icon size={21} /><span>{label}</span></NavLink>)}
        <button className={cx("mobile-dock-link", mobileMoreActive && "active")} onClick={() => setMobileOpen(true)}><Menu size={21} /><span>More</span></button>
      </nav> : null}
    </div>
  );
}
