[33mcommit a983ce2a27caa482e9c3ebf917ae1664838f1acf[m
Author: shotasuetsugu-eng <shota.suetsugu@tx-inc.com>
Date:   Mon Jul 6 15:25:50 2026 +0900

    Expand public site editor

[1mdiff --git a/client/src/App.tsx b/client/src/App.tsx[m
[1mindex 198b99e..88aaa0b 100644[m
[1m--- a/client/src/App.tsx[m
[1m+++ b/client/src/App.tsx[m
[36m@@ -1,7 +1,7 @@[m
 import { Toaster } from "@/components/ui/sonner";[m
 import { TooltipProvider } from "@/components/ui/tooltip";[m
 import NotFound from "@/pages/NotFound";[m
[31m-import { Route, Switch } from "wouter";[m
[32m+[m[32mimport { Route, Switch, useLocation } from "wouter";[m
 import { lazy, Suspense } from "react";[m
 import ErrorBoundary from "./components/ErrorBoundary";[m
 import { ThemeProvider } from "./contexts/ThemeContext";[m
[36m@@ -31,25 +31,35 @@[m [mfunction SiteEditorRoute() {[m
   );[m
 }[m
 [m
[31m-function Router() {[m
[32m+[m[32mfunction PublicRouter() {[m
[32m+[m[32m  return ([m
[32m+[m[32m    <Switch>[m
[32m+[m[32m      <Route path="/" component={DashboardRenderer} />[m
[32m+[m[32m      <Route path="/p/:slug" component={DashboardRenderer} />[m
[32m+[m[32m      <Route component={NotFound} />[m
[32m+[m[32m    </Switch>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction PrivateRouter() {[m
   return ([m
     <CyberLayout>[m
       <Switch>[m
         <Route path="/site-editor" component={SiteEditorRoute} />[m
[31m-        <Route path="/" component={DashboardRenderer} />[m
         <Route path="/procedures" component={Procedures} />[m
         <Route path="/procedures/:id" component={ProcedureDetail} />[m
         <Route path="/checklists" component={Checklists} />[m
         <Route path="/checklists/:id" component={ChecklistDetail} />[m
         <Route path="/documents" component={Documents} />[m
         <Route path="/search" component={Search} />[m
[31m-        <Route path="/admin" component={AdminPanel} />        <Route path="/map" component={MapPage} />[m
[32m+[m[32m        <Route path="/admin" component={AdminPanel} />[m
[32m+[m[32m        <Route path="/map" component={MapPage} />[m
         <Route path="/shift" component={SpreadsheetPage} />[m
         <Route path="/stores" component={SpreadsheetPage} />[m
[31m-          <Route path="/measurement-values" component={MeasurementValuesPage} />[m
[32m+[m[32m        <Route path="/measurement-values" component={MeasurementValuesPage} />[m
         <Route path="/integrations" component={Integrations} />[m
[31m-          <Route path="/router-setup" component={RouterSetup} />[m
[31m-          <Route path="/Wifi-setup" component={RouterSetup} />[m
[32m+[m[32m        <Route path="/router-setup" component={RouterSetup} />[m
[32m+[m[32m        <Route path="/Wifi-setup" component={RouterSetup} />[m
         <Route path="/deploy-calendar" component={DeployCalendar} />[m
         <Route path="/fs-team-calendar" component={DeployCalendar} />[m
         <Route path="/404" component={NotFound} />[m
[36m@@ -59,6 +69,13 @@[m [mfunction Router() {[m
   );[m
 }[m
 [m
[32m+[m[32mfunction Router() {[m
[32m+[m[32m  const [location] = useLocation();[m
[32m+[m[32m  const isPublicSitePage = location === "/" || location.startsWith("/p/");[m
[32m+[m
[32m+[m[32m  return isPublicSitePage ? <PublicRouter /> : <PrivateRouter />;[m
[32m+[m[32m}[m
[32m+[m
 function App() {[m
   return ([m
     <ErrorBoundary>[m
[36m@@ -73,14 +90,3 @@[m [mfunction App() {[m
 }[m
 [m
 export default App;[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
