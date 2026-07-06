import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardRenderer from "./pages/DashboardRenderer";
import Procedures from "./pages/Procedures";
import ProcedureDetail from "./pages/ProcedureDetail";
import Checklists from "./pages/Checklists";
import ChecklistDetail from "./pages/ChecklistDetail";
import Documents from "./pages/Documents";
import Search from "./pages/Search";
import AdminPanel from "./pages/AdminPanel";
import MapPage from "./pages/MapPage";
import SpreadsheetPage from "./pages/SpreadsheetPage";
import MeasurementValuesPage from "./pages/MeasurementValuesPage";
import Integrations from "./pages/Integrations";
import RouterSetup from "./pages/RouterSetup";
import DeployCalendar from "./pages/DeployCalendar";
import CyberLayout from "./components/CyberLayout";

const SiteEditor = lazy(() => import("./pages/SiteEditor"));

function SiteEditorRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-primary">EDITOR LOADING...</div>}>
      <SiteEditor />
    </Suspense>
  );
}

function PublicRouter() {
  return (
    <Switch>
            <Route path="/p/:slug" component={DashboardRenderer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PrivateRouter() {
  return (
    <CyberLayout>
      <Switch>
        <Route path="/site-editor" component={SiteEditorRoute} />
        <Route path="/" component={DashboardRenderer} />
        <Route path="/procedures" component={Procedures} />
        <Route path="/procedures/:id" component={ProcedureDetail} />
        <Route path="/checklists" component={Checklists} />
        <Route path="/checklists/:id" component={ChecklistDetail} />
        <Route path="/documents" component={Documents} />
        <Route path="/search" component={Search} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/map" component={MapPage} />
        <Route path="/shift" component={SpreadsheetPage} />
        <Route path="/stores" component={SpreadsheetPage} />
        <Route path="/measurement-values" component={MeasurementValuesPage} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/router-setup" component={RouterSetup} />
        <Route path="/Wifi-setup" component={RouterSetup} />
        <Route path="/deploy-calendar" component={DeployCalendar} />
        <Route path="/fs-team-calendar" component={DeployCalendar} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </CyberLayout>
  );
}

function Router() {
  const [location] = useLocation();
  const isPublicSitePage = location.startsWith("/p/");

  return isPublicSitePage ? <PublicRouter /> : <PrivateRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;


