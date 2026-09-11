import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth-provider';
import { AuthGuard } from '@/components/auth-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { LoginPage, SignupPage } from '@/pages/auth-pages';
import { ChatPage, CompanionPage, InsightsPage, JournalPage, MemoryPage, SettingsPage } from '@/pages/unsaid-pages';
import { PrivateNotesPage } from '@/pages/private-notes-page';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
         <Route path="/login" component={LoginPage} />
         <Route path="/signup" component={SignupPage} />
         <Route path="/" component={() => <AuthGuard><CompanionPage /></AuthGuard>} />
         <Route path="/chat" component={() => <AuthGuard><ChatPage /></AuthGuard>} />
         <Route path="/journal" component={() => <AuthGuard><JournalPage /></AuthGuard>} />
         <Route path="/insights" component={() => <AuthGuard><InsightsPage /></AuthGuard>} />
         <Route path="/private" component={() => <AuthGuard><PrivateNotesPage /></AuthGuard>} />
         <Route path="/memory" component={() => <AuthGuard><MemoryPage /></AuthGuard>} />
         <Route path="/settings" component={() => <AuthGuard><SettingsPage /></AuthGuard>} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
