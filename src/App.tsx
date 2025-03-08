import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PropellerAdsInit from './components/PropellerAdsInit';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import GoogleAnalytics from './components/GoogleAnalytics';
import GoogleAdsense from './components/GoogleAdsense';
import SkeletonLoader from './components/SkeletonLoader';

// Eagerly loaded components
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

// Lazily loaded components with preloading
const componentImports = {
  Dashboard: () => import('./pages/Dashboard'),
  ViewPaste: () => import('./pages/ViewPaste'),
  EditPaste: () => import('./pages/EditPaste'),
  Settings: () => import('./pages/Settings'),
  ProfileSettings: () => import('./pages/ProfileSettings'),
  Folders: () => import('./pages/Folders'),
  FolderView: () => import('./pages/FolderView'),
  Favorites: () => import('./pages/Favorites'),
  Profile: () => import('./pages/Profile'),
  Drafts: () => import('./pages/Drafts'),
  ActivityFeed: () => import('./pages/ActivityFeed'),
  Pricing: () => import('./pages/Pricing'),
  Purchase: () => import('./pages/Purchase'),
  Success: () => import('./pages/Success'),
  AllPastes: () => import('./pages/AllPastes'),
  CreatePaste: () => import('./pages/CreatePaste'),
};

// Preload components in the background
Object.values(componentImports).forEach(importFn => {
  importFn().catch(() => {
    // Silently handle preload errors
  });
});

// Enhanced retry logic for imports
const retryImport = async (importFn: () => Promise<any>, retries = 3): Promise<any> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Import failed');
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

// Lazy load components with enhanced retry
const Dashboard = lazy(() => retryImport(componentImports.Dashboard));
const ViewPaste = lazy(() => retryImport(componentImports.ViewPaste));
const EditPaste = lazy(() => retryImport(componentImports.EditPaste));
const Settings = lazy(() => retryImport(componentImports.Settings));
const ProfileSettings = lazy(() => retryImport(componentImports.ProfileSettings));
const Folders = lazy(() => retryImport(componentImports.Folders));
const FolderView = lazy(() => retryImport(componentImports.FolderView));
const Favorites = lazy(() => retryImport(componentImports.Favorites));
const Profile = lazy(() => retryImport(componentImports.Profile));
const Drafts = lazy(() => retryImport(componentImports.Drafts));
const Followers = lazy(() => retryImport(() => import('./pages/Followers')));
const Following = lazy(() => retryImport(() => import('./pages/Following')));
const ActivityFeed = lazy(() => retryImport(componentImports.ActivityFeed));
const Pricing = lazy(() => retryImport(componentImports.Pricing));
const Purchase = lazy(() => retryImport(componentImports.Purchase));
const Success = lazy(() => retryImport(componentImports.Success));
const AllPastes = lazy(() => retryImport(componentImports.AllPastes));
const CreatePaste = lazy(() => retryImport(componentImports.CreatePaste));
const PrivacyPolicy = lazy(() => retryImport(() => import('./pages/PrivacyPolicy')));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-full max-w-4xl space-y-4 p-4">
      <SkeletonLoader className="h-12 w-full" />
      <SkeletonLoader className="h-64 w-full" />
      <SkeletonLoader className="h-32 w-full" />
    </div>
  </div>
);

// Error recovery component
const ErrorRecovery = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <div className="space-y-4">
          <button
            onClick={() => {
              resetError();
              window.location.reload();
            }}
            className="w-full px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              resetError();
              navigate('/', { replace: true });
            }}
            className="w-full px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      
      // Ignore certain third-party script errors
      if (event.message === 'Script error.' && !event.error) {
        return;
      }

      // Log error for debugging
      console.error('Application error:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
      
      // Handle navigation errors
      if (event.error?.message?.includes('Failed to fetch') || 
          event.error?.message?.includes('Loading chunk') ||
          event.error?.message?.includes('Failed to load')) {
        navigate('/', { replace: true });
      }
    };

    // Handle unhandled rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      
      console.error('Unhandled rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Initialize third-party scripts with error handling
    const initScripts = async () => {
      const scripts = [
        () => import('./components/PropellerAdsInit').then(m => m.default()),
        () => import('./components/GoogleAnalytics').then(m => m.default()),
        () => import('./components/GoogleAdsense').then(m => m.default())
      ];

      for (const script of scripts) {
        try {
          await script();
        } catch (error) {
          console.warn('Failed to load script:', error);
        }
      }
    };

    initScripts();

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [navigate]);

  return (
    <Routes key={location.pathname} location={location}>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        {/* Other routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;