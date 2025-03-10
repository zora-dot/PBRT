import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import GoogleAnalytics from './components/GoogleAnalytics';
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

// Preload components
Object.values(componentImports).forEach(importFn => {
  importFn(); // Start loading in background
});

// Lazily loaded components with retry logic
const retryImport = async (importFn: () => Promise<any>, retries = 3): Promise<any> => {
  try {
    return await importFn();
  } catch (error: unknown) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retryImport(importFn, retries - 1);
    }
    throw error instanceof Error ? error : new Error('Import failed');
  }
};

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
const Followers = lazy(() => import('./pages/Followers'));
const Following = lazy(() => import('./pages/Following'));
const ActivityFeed = lazy(() => retryImport(componentImports.ActivityFeed));
const Pricing = lazy(() => retryImport(componentImports.Pricing));
const Purchase = lazy(() => retryImport(componentImports.Purchase));
const Success = lazy(() => retryImport(componentImports.Success));
const AllPastes = lazy(() => retryImport(componentImports.AllPastes));
const CreatePaste = lazy(() => retryImport(componentImports.CreatePaste));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

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
const ErrorRecovery = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button
        onClick={resetError}
        className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Router component with location key and error boundary
function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Handle Ezoic ad refresh on route changes
  useEffect(() => {
    if (window.ezstandalone?.showAds) {
      try {
        window.ezstandalone.cmd.push(() => {
          window.ezstandalone.showAds();
        });
      } catch (error) {
        console.warn('Error refreshing Ezoic ads:', error);
      }
    }
  }, [location.pathname]);

  // Handle navigation errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Navigation error:', event.error);
      if (event.error?.message?.includes('Failed to fetch dynamically imported module')) {
        navigate('/error', { replace: true });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
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
        <Route path="/all-pastes" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <AllPastes />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/p/:id" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <ViewPaste />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/paste/:id" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <ViewPaste />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/paste/:id/edit" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <EditPaste />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Settings />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/profile-settings" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <ProfileSettings />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/folders" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Folders />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/folder/:folderId" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <FolderView />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Favorites />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/profile/:username" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/drafts" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Drafts />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/profile/:username/followers" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <Followers />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/profile/:username/following" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <Following />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/activity" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <ActivityFeed />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/pricing" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <Pricing />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/purchase" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Purchase />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/success" element={
          <ProtectedRoute>
            <ErrorBoundary FallbackComponent={ErrorRecovery}>
              <Suspense fallback={<PageLoader />}>
                <Success />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/create-paste" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <CreatePaste />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/privacy" element={
          <ErrorBoundary FallbackComponent={ErrorRecovery}>
            <Suspense fallback={<PageLoader />}>
              <PrivacyPolicy />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <BrowserRouter>
                <GoogleAnalytics />
                <AppRoutes />
              </BrowserRouter>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;