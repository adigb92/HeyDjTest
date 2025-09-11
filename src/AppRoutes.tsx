import React, { lazy, useContext, Suspense } from 'react';
import { Route, Routes, Navigate, useParams } from 'react-router-dom';
import UserContext from './components/UserContext';
import LoadingSpinner from './components/LoadingSpinner';
import { AppUser } from './interfaces/types';
import DashboardPage from './components/DashboardPage';

// Lazy load components
const RegistrationPage = lazy(() => import('./components/RegistrationPage'));
const GenreSelectionPage = lazy(() => import('./components/GenreSelectionPage'));
const ConfirmationPage = lazy(() => import('./components/ConfirmationPage'));
const DJLiveEventPage = lazy(() => import('./components/DJLiveEventPage'));
const DJEventCreationPage = lazy(() => import('./components/DJEventCreationPage'));
const DJEventEditPage = lazy(() => import('./components/DJEventEditPage'));
const DJEventManagementPage = lazy(() => import('./components/DJEventManagementPage'));
const DJEventsListPage = lazy(() => import('./components/DJEventsListPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const ProfileCompletionPage = lazy(() => import('./components/ProfileCompletionPage'));
const QRScanResultPage = lazy(() => import('./components/QRScanResultPage'));
const QrCodeForDj = lazy(() => import('./components/QrCodeForDj'));
const QrCodeScanningGuests = lazy(() => import('./components/QrCodeScanningGuests'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useContext(UserContext);

    if (loading) {
        return <LoadingSpinner fullScreen variant="bootstrap" />;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// QR Code Route component
const QRCodeRoute = () => {
    const { qrCodeIdentifier } = useParams();
    return <QRScanResultPage qrCodeIdentifier={qrCodeIdentifier || ''} />;
};

// DJ Event Creation Route component
const DJEventCreationRoute = () => {
    const { user } = useContext(UserContext);
    if (!user) return <Navigate to="/" replace />;
    return <DJEventCreationPage currentUser={user} />;
};

const AppRoutes = () => {
    return (
        <Suspense fallback={<LoadingSpinner fullScreen variant="bootstrap" />}>
            <Routes>
                <Route path="/register" element={<RegistrationPage />} />
                <Route path="/genre-selection" element={<GenreSelectionPage />} />
                <Route path="/confirmation" element={<ConfirmationPage />} />
                <Route path="/dj-live-event" element={<ProtectedRoute><DJLiveEventPage /></ProtectedRoute>} />
                <Route path="/dj-event-creation" element={<ProtectedRoute><DJEventCreationRoute /></ProtectedRoute>} />
                <Route path="/events/edit/:id" element={<ProtectedRoute><DJEventEditPage /></ProtectedRoute>} />
                <Route path="/dj-event-management" element={<ProtectedRoute><DJEventManagementPage /></ProtectedRoute>} />
                <Route path="/dj-events-list" element={<ProtectedRoute><DJEventsListPage /></ProtectedRoute>} />
                <Route path="/" element={<LoginPage />} />
                <Route path="/complete-profile" element={<ProtectedRoute><ProfileCompletionPage /></ProtectedRoute>} />
                <Route path="/qr-scan/:qrCodeIdentifier" element={<QRCodeRoute />} />
                <Route path="/dj-qr-code" element={<ProtectedRoute><QrCodeForDj /></ProtectedRoute>} />
                <Route path="/scan-qr" element={<QrCodeScanningGuests />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AppRoutes;
