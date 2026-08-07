import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { VaultProvider, useVault } from "./context/VaultContext";
import { AuthPage } from "./components/auth/AuthPage";
import { EntityUiProvider } from "./components/entities/EntityUiProvider";
import { AppShell } from "./components/layout/AppShell";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { ArchivePage } from "./pages/ArchivePage";
import { CommitsPage } from "./pages/CommitsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DecisionsPage } from "./pages/DecisionsPage";
import { HierarchyPage } from "./pages/HierarchyPage";
import { PromptsPage } from "./pages/PromptsPage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { ScopedRecordsPage } from "./pages/ScopedRecordsPage";
import { MindsetConstructionPage } from "./pages/MindsetConstructionPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";

function AuthenticatedRoutes() {
  const { loading } = useVault();
  if (loading) return <LoadingScreen />;
  return (
    <EntityUiProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="hierarchy" element={<HierarchyPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="mindsets" element={<ScopedRecordsPage kind="mindsets" />} />
          <Route path="mindset-construction" element={<MindsetConstructionPage />} />
          <Route path="preferences" element={<ScopedRecordsPage kind="preferences" />} />
          <Route path="commits" element={<CommitsPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="archive" element={<ArchivePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </EntityUiProvider>
  );
}

function SessionBoundary() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen label="Checking your session" />;
  if (!user) return <AuthPage />;
  return (
    <VaultProvider>
      <AuthenticatedRoutes />
    </VaultProvider>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <SessionBoundary />
        </AuthProvider>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" closeButton />
    </MotionConfig>
  );
}
