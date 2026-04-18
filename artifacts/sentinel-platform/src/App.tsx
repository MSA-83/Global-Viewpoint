import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { RealtimeProvider } from "@/contexts/realtime";

// Pages
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import MapPage from "@/pages/map";
import Threats from "@/pages/threats";
import Incidents from "@/pages/incidents";
import Assets from "@/pages/assets";
import Gps from "@/pages/gps";
import Signals from "@/pages/signals";
import Settings from "@/pages/settings";
import AlertsPage from "@/pages/alerts";
import CasesPage from "@/pages/cases";
import AnalyticsPage from "@/pages/analytics";
import SearchPage from "@/pages/search";
import CopilotPage from "@/pages/copilot";
import KnowledgeGraphPage from "@/pages/knowledge";
import AdminPage from "@/pages/admin";
import WorkspacesPage from "@/pages/workspaces";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050c18] flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[10px] text-green-600 tracking-widest">AUTHENTICATING SESSION...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <RealtimeProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/map" component={MapPage} />
          <Route path="/threats" component={Threats} />
          <Route path="/incidents" component={Incidents} />
          <Route path="/assets" component={Assets} />
          <Route path="/gps" component={Gps} />
          <Route path="/signals" component={Signals} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/cases" component={CasesPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/copilot" component={CopilotPage} />
          <Route path="/knowledge" component={KnowledgeGraphPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/workspaces" component={WorkspacesPage} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RealtimeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
