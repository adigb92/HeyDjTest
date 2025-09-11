import axios from 'axios';
import { handleApiError } from './errorHandler';

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Add request interceptor to include token from localStorage
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('apiClient: Token included in request to:', config.url);
        } else {
            console.log('apiClient: No token found for request to:', config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    response => response,
    error => {
        // Don't handle the error here, let the individual request handlers deal with it
        return Promise.reject(error);
    }
);

export const get = async <T>(url: string): Promise<T> => {
    try {
        const response = await apiClient.get<T>(url);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const post = async <T>(url: string, data: any): Promise<T> => {
    try {
        const response = await apiClient.post<T>(url, data);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const put = async <T>(url: string, data: any): Promise<T> => {
    try {
        const response = await apiClient.put<T>(url, data);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const del = async <T>(url: string): Promise<T> => {
    try {
        const response = await apiClient.delete<T>(url);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export default apiClient; 