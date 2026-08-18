import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Brain,
  BrainCircuit,
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  FileCode2,
  LayoutDashboard,
  Layers3,
  LogOut,
  Moon,
  Network,
  Orbit,
  Search,
  Share2,
  Sparkles,
  WandSparkles,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Tooltip } from "radix-ui";
import { useAuth } from "../../context/AuthContext";
import { useVault } from "../../context/VaultContext";
import { useTheme } from "../../hooks/useTheme";
import { cx } from "../../lib/utils";
import { EurekaMark } from "../brand/EurekaIdentity";
import { CommandPalette } from "./CommandPalette";

const coreNav = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Achievements", "/achievements", Trophy],
  ["Vault", "/hierarchy", Network],
  ["Prompts", "/prompts", FileCode2],
] as const;

const knowledgeNav = [
  ["Relationships", "/relationships", Share2],
  ["Mindsets", "/mindsets", Brain],
  ["Mindset builder", "/mindset-construction", BrainCircuit],
  ["Preferences", "/preferences", SlidersHorizontal],
] as const;

const aiNav = [
  ["Find Prompt", "/ai/find-prompt", Sparkles],
  ["Prompt Mixer", "/ai/prompt-mixer", Layers3],
  ["Repurpose Prompt", "/ai/repurpose-prompt", WandSparkles],
] as const;

const historyNav = [
  ["Global Versions", "/versions", Camera],
  ["Decisions", "/decisions", BriefcaseBusiness],
  ["Archive", "/archive", Archive],
] as const;

const systemNav = [
  ["Roadmap gates", "/roadmap", ArchiveRestore],
  ["Settings", "/settings", Settings2],
] as const;

const navigationCategories = [
  ["AI", Sparkles, aiNav],
  ["Knowledge", Orbit, knowledgeNav],
  ["History", Camera, historyNav],
  ["System", Settings2, systemNav],
] as const;

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

function isRouteActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function wheelOffset(index: number, count: number) {
  const spread = count === 2 ? 54 : count === 3 ? 82 : 108;
  const angle = count === 1 ? 0 : -spread / 2 + (spread * index) / (count - 1);
  const radians = (angle * Math.PI) / 180;
  const radius = count === 4 ? 142 : 136;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function mobileWheelOffset(index: number, count: number) {
  const angle = count === 1 ? -90 : -90 + (360 * index) / count;
  const radians = (angle * Math.PI) / 180;
  const radius = 116;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

export function AppShell() {
  const { user, signOut, resendVerification } = useAuth();
  const { data, profile, connection } = useVault();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    setOpenCategory(null);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenCategory(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const breadcrumb = useMemo(() => {
    const promptMatch = location.pathname.match(/^\/prompts\/([^/]+)/);
    if (promptMatch) {
      const prompt = data.prompts[promptMatch[1]];
      const task = prompt ? data.tasks[prompt.taskId] : undefined;
      const endeavor = task ? data.endeavors[task.endeavorId] : undefined;
      return [endeavor?.name, task?.name, prompt?.title].filter(Boolean) as string[];
    }
    const entries = [...coreNav, ...knowledgeNav, ...aiNav, ...historyNav, ...systemNav];
    const current = entries.find(([, path]) => isRouteActive(location.pathname, path));
    return [profile?.workspaceName || "Personal Vault", current?.[0] || "EurekaVault"];
  }, [data.endeavors, data.prompts, data.tasks, location.pathname, profile?.workspaceName]);

  async function logout() {
    await signOut();
    toast.success("Signed out.");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <aside className="sidebar sidebar--category-rail" aria-label="Workspace navigation">
        <div className="sidebar__brand-row sidebar__brand-row--rail">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button className="workspace-switcher workspace-switcher--rail" aria-label="Go to EurekaVault overview" onClick={() => navigate("/dashboard")}>
                <EurekaMark className="eureka-mark--rail" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={10}>EurekaVault · {profile?.workspaceName || "Personal Vault"}</Tooltip.Content></Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="sidebar__status sidebar__status--rail" aria-label={connection === "connected" ? "Synced with Firebase" : connection}>
              <span className={cx("connection-dot", `connection-dot--${connection}`)} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={10}>{connection === "connected" ? "Synced with Firebase" : connection}</Tooltip.Content></Tooltip.Portal>
        </Tooltip.Root>

        <nav className="category-rail" aria-label="Navigation categories">
          {navigationCategories.map(([categoryLabel, CategoryIcon, items]) => {
            const expanded = openCategory === categoryLabel;
            const categoryActive = items.some(([, path]) => isRouteActive(location.pathname, path));
            return (
              <div className="nav-wheel" data-category={categoryLabel.toLowerCase()} key={categoryLabel}>
                <button
                  className={cx("nav-wheel__launcher", expanded && "expanded", categoryActive && "active")}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Close" : "Open"} ${categoryLabel} navigation`}
                  onClick={() => setOpenCategory((current) => current === categoryLabel ? null : categoryLabel)}
                >
                  <CategoryIcon size={21} strokeWidth={1.75} />
                  <span>{categoryLabel}</span>
                </button>

                <AnimatePresence>
                  {expanded ? (
                    <motion.div className="nav-wheel__orbit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="nav-wheel__ring" aria-hidden />
                      {items.map(([label, path, Icon], index) => {
                        const offset = wheelOffset(index, items.length);
                        return (
                          <motion.div
                            className="nav-wheel__satellite"
                            key={path}
                            initial={{ opacity: 0, x: 0, y: 0, scale: 0.72 }}
                            animate={{ opacity: 1, x: offset.x, y: offset.y, scale: 1 }}
                            exit={{ opacity: 0, x: 0, y: 0, scale: 0.72 }}
                            transition={{ type: "spring", stiffness: 420, damping: 31, delay: index * 0.025 }}
                          >
                            <NavLink to={path} className={({ isActive }) => cx("nav-wheel__item", isActive && "active")} aria-label={label}>
                              <Icon size={20} strokeWidth={1.8} />
                              <span>{label}</span>
                            </NavLink>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer sidebar__footer--rail">
          <div className="theme-switcher theme-switcher--rail" aria-label="Theme">
            <Tooltip.Root>
              <Tooltip.Trigger asChild><button aria-label="Light theme" className={mode === "light" ? "active" : ""} onClick={() => setMode("light")}><Sun size={15} /></button></Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={9}>Light</Tooltip.Content></Tooltip.Portal>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild><button aria-label="Dark theme" className={mode === "dark" ? "active" : ""} onClick={() => setMode("dark")}><Moon size={15} /></button></Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={9}>Dark</Tooltip.Content></Tooltip.Portal>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild><button aria-label="System theme" className={mode === "system" ? "active" : ""} onClick={() => setMode("system")}>A</button></Tooltip.Trigger>
              <Tooltip.Portal><Tooltip.Content className="tooltip-content" side="right" sideOffset={9}>Auto</Tooltip.Content></Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {openCategory ? <motion.button className="nav-wheel-scrim" aria-label="Close navigation category" onClick={() => setOpenCategory(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /> : null}
      </AnimatePresence>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__leading">
            <button className="mobile-home-button" aria-label="Go to EurekaVault overview" onClick={() => navigate("/dashboard")}><EurekaMark className="eureka-mark--mobile" /></button>
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

      <nav className="mobile-category-dock" aria-label="Persistent mobile navigation categories">
        {navigationCategories.map(([categoryLabel, CategoryIcon, items]) => {
          const expanded = openCategory === categoryLabel;
          const categoryActive = items.some(([, path]) => isRouteActive(location.pathname, path));
          return (
            <button
              key={categoryLabel}
              data-category={categoryLabel.toLowerCase()}
              className={cx("mobile-category-launcher", expanded && "expanded", categoryActive && "active")}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Close" : "Open"} ${categoryLabel} navigation wheel`}
              onClick={() => setOpenCategory((current) => current === categoryLabel ? null : categoryLabel)}
            >
              <CategoryIcon size={20} strokeWidth={1.8} />
              <span>{categoryLabel}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {openCategory ? navigationCategories.map(([categoryLabel, CategoryIcon, items]) => openCategory === categoryLabel ? (
          <motion.div
            className="mobile-category-wheel"
            data-category={categoryLabel.toLowerCase()}
            key={categoryLabel}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.16 }}
            aria-label={`${categoryLabel} navigation`}
          >
            <div className="mobile-category-wheel__ring" aria-hidden />
            <div className="mobile-category-wheel__hub">
              <CategoryIcon size={27} strokeWidth={1.7} />
              <strong>{categoryLabel}</strong>
            </div>
            {items.map(([label, path, Icon], index) => {
              const offset = mobileWheelOffset(index, items.length);
              return (
                <motion.div
                  className="mobile-category-wheel__satellite"
                  key={path}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.65 }}
                  animate={{ opacity: 1, x: offset.x, y: offset.y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.65 }}
                  transition={{ type: "spring", stiffness: 400, damping: 29, delay: index * 0.025 }}
                >
                  <NavLink to={path} className={({ isActive }) => cx("mobile-category-wheel__item", isActive && "active")} aria-label={label}>
                    <Icon size={22} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                </motion.div>
              );
            })}
          </motion.div>
        ) : null) : null}
      </AnimatePresence>
    </div>
  );
}
