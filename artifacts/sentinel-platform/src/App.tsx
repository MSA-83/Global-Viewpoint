import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import MapPage from "@/pages/map";
import Threats from "@/pages/threats";
import Incidents from "@/pages/incidents";
import Assets from "@/pages/assets";
import Gps from "@/pages/gps";
import Signals from "@/pages/signals";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/map" component={MapPage} />
        <Route path="/threats" component={Threats} />
        <Route path="/incidents" component={Incidents} />
        <Route path="/assets" component={Assets} />
        <Route path="/gps" component={Gps} />
        <Route path="/signals" component={Signals} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
