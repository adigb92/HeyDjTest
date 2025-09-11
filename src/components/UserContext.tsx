import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppUser } from '../interfaces/types';
import { get, post } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';
import { useLocation } from 'react-router-dom';

type UserContextType = {
    user: AppUser | null;
    updateUser: (user: AppUser | null) => void;
    logout: () => void;
    loading: boolean;
    isAdmin: boolean;
    clearUserContext: () => void;
    refreshAuth: () => void;
};

const defaultContextValue: UserContextType = {
    user: null,
    updateUser: () => { },
    logout: () => { },
    loading: true,
    isAdmin: false,
    clearUserContext: () => { },
    refreshAuth: () => { }
};

const UserContext = createContext<UserContextType>(defaultContextValue);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(false);
    const location = useLocation();

    const checkAuth = async () => {
        // Prevent multiple simultaneous authentication checks
        if (isCheckingAuth) {
            console.log('UserContext: Authentication check already in progress, skipping...');
            return;
        }
        
        try {
            setIsCheckingAuth(true);
            console.log('UserContext: Starting authentication check...');
            
            // Read token if available, but proceed even if absent (cookie-based auth fallback)
            const token = localStorage.getItem('token');
            console.log('UserContext: Token from localStorage:', token ? 'Token exists' : 'No token');

            // Do not early-return if token is missing — rely on cookies via withCredentials
            console.log('UserContext: Checking /user/check-auth (cookies will be sent if present)');

            // Optional: brief delay to ensure any recent token/cookie writes settle
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const response = await get<{ isAuthenticated: boolean; user: AppUser; isAdmin: boolean }>('/user/check-auth');
            console.log('UserContext: Authentication response:', response);
            
            if (response.isAuthenticated && response.user) {
                console.log('UserContext: User authenticated, setting user state');
                setUser(response.user);
                setIsAdmin(response.user.isAdmin || false);
            } else {
                console.log('UserContext: User not authenticated');
                // Clear token if authentication failed
                localStorage.removeItem('token');
                setUser(null);
                setIsAdmin(false);
            }
        } catch (error) {
            console.error('UserContext: Authentication check error:', error);
            // Clear user state on any error
            setUser(null);
            setIsAdmin(false);
            
            // Clear token if there's an error
            localStorage.removeItem('token');
            
            // Only show error if it's not a 401 (unauthorized)
            if (error instanceof Error && !error.message.includes('401')) {
                handleApiError(error, 'Failed to check authentication status');
            }
        } finally {
            setLoading(false);
            setIsCheckingAuth(false);
            console.log('UserContext: Authentication check completed');
        }
    };

    // Initial authentication check with QR-registration pre-clear
    useEffect(() => {
        (async () => {
            try {
                const isRegisterPath = location.pathname === '/register';
                const params = new URLSearchParams(location.search);
                const hasQrParams = !!(params.get('djId') || params.get('eventId'));
                if (isRegisterPath && hasQrParams) {
                    console.log('UserContext: QR registration context detected; clearing any existing session');
                    // Clear local token first to avoid sending DJ bearer
                    localStorage.removeItem('token');
                    // Clear cookie on backend
                    try { await post('/user/logout', {}); } catch (_e) {}
                    // Reset in-memory state
                    setUser(null);
                    setIsAdmin(false);
                    // Small delay to allow cookie clearing to propagate
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (e) {
                console.warn('UserContext: Error during QR pre-clear step', e);
            } finally {
                checkAuth();
            }
        })();
        // Only run on initial mount or when the register QR params change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateUser = (updatedUser: AppUser | null) => {
        console.log('UserContext: updateUser called with:', updatedUser);
        if (updatedUser) {
            console.log('UserContext: Setting user state with:', {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin
            });
        }
        setUser(updatedUser);
        setIsAdmin(updatedUser?.isAdmin || false);
        console.log('UserContext: User state updated, new state:', { user: updatedUser, isAdmin: updatedUser?.isAdmin || false });
        
        // If we're updating with a user, trigger a fresh authentication check
        if (updatedUser && !isCheckingAuth) {
            console.log('UserContext: Triggering fresh authentication check after user update');
            setTimeout(() => {
                if (!isCheckingAuth) {
                    console.log('UserContext: Executing delayed authentication check...');
                    checkAuth();
                }
            }, 100);
        }
    };

    const refreshAuth = () => {
        console.log('UserContext: Manual refresh requested');
        checkAuth();
    };

    const logout = () => {
        console.log('UserContext: Logging out user');
        localStorage.removeItem('token');
        setUser(null);
        setIsAdmin(false);
    };

    const clearUserContext = () => {
        console.log('UserContext: Clearing user context');
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem('token');
        sessionStorage.removeItem('pendingEventData');
    };

    const value = {
        user,
        loading,
        isAdmin,
        updateUser,
        refreshAuth,
        logout,
        clearUserContext
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);

export default UserContext;
