import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppUser } from '../interfaces/types';
import { get, post } from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const useAuth = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await get<{ isAuthenticated: boolean; user: AppUser; isAdmin: boolean }>('/user/check-auth');
                if (response.isAuthenticated) {
                    setUser(response.user);
                    setIsAdmin(response.isAdmin);
                }
            } catch (error) {
                setError(handleApiError(error, 'Authentication failed'));
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const logout = async () => {
        try {
            await post('/user/logout', {});
            setUser(null);
            setIsAdmin(false);
            navigate('/');
        } catch (error) {
            setError(handleApiError(error, 'Logout failed'));
        }
    };

    return { user, isAdmin, loading, error, logout };
}; 