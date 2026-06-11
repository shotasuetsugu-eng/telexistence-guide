import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
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

function Router() {
  return (
    <CyberLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/procedures" component={Procedures} />
        <Route path="/procedures/:id" component={ProcedureDetail} />
        <Route path="/checklists" component={Checklists} />
        <Route path="/checklists/:id" component={ChecklistDetail} />
        <Route path="/documents" component={Documents} />
        <Route path="/search" component={Search} />
        <Route path="/admin" component={AdminPanel} />        <Route path="/map" component={MapPage} />
        <Route path="/shift" component={SpreadsheetPage} />
        <Route path="/stores" component={SpreadsheetPage} />
          <Route path="/measurement-values" component={MeasurementValuesPage} />
        <Route path="/integrations" component={Integrations} />
          <Route path="/router-setup" component={RouterSetup} />
          <Route path="/Wifi-setup" component={RouterSetup} />
        <Route path="/deploy-calendar" component={DeployCalendar} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </CyberLayout>
  );
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










