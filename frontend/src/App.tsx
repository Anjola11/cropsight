import React, { Suspense, lazy } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Skeleton } from './components/ui/Skeleton';

// Lazy loaded page components
const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const ScanPage = lazy(() =>
  import('./pages/ScanPage').then((m) => ({ default: m.ScanPage }))
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const ModelPage = lazy(() =>
  import('./pages/ModelPage').then((m) => ({ default: m.ModelPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const PageFallback: React.FC = () => (
  <div className="w-full space-y-4">
    <Skeleton className="h-8 w-48 rounded-[8px]" />
    <Skeleton className="h-4 w-72 rounded-[6px]" />
    <Skeleton className="h-[360px] w-full rounded-[20px]" />
  </div>
);

// TanStack Router Root Route
const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  ),
  notFoundComponent: () => (
    <Suspense fallback={<PageFallback />}>
      <NotFoundPage />
    </Suspense>
  ),
});

// Route definitions
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <OverviewPage />,
});

const scanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scan',
  component: () => <ScanPage />,
});

const scanDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scan/$scanId',
  component: () => <ScanPage />,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: () => <HistoryPage />,
});

const modelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/model',
  component: () => <ModelPage />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scanRoute,
  scanDetailRoute,
  historyRoute,
  modelRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// React Query client configured per spec 6.2 (staleTime 5 min, retry 1)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
