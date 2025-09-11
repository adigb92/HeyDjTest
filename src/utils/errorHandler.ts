import { AxiosError } from 'axios';
import { toast, ToastOptions } from 'react-toastify';

const toastConfig: ToastOptions = {
    position: toast.POSITION.TOP_CENTER,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    className: 'toast-notification',
    toastId: 'error-toast'
};

export const handleApiError = (error: unknown, defaultMessage = 'An error occurred'): string => {
    // Deduplicate: if an error toast is already active, just return message silently
    if (toast.isActive('error-toast')) {
        return error instanceof Error ? error.message : defaultMessage;
    }

    // Axios-specific handling
    if (error instanceof AxiosError) {
        const status = error.response?.status;
        const url = (error.config as any)?.url || '';
        const message = error.response?.data?.message || defaultMessage;

        // Suppress routine/expected errors:
        // - Unauthenticated auth check
        if (status === 401 && url.includes('/user/check-auth')) {
            return message;
        }
        // - No live events available (not an app error)
        if (status === 404 && url.includes('/events/live')) {
            return message;
        }
        // - Assignment already exists (benign for idempotent flows)
        if (status === 400 && url.includes('/events/assign-user') && /already registered/i.test(String(message))) {
            return message;
        }
        // - Canceled requests (navigation changes, race conditions)
        if (error.code === 'ERR_CANCELED' || /cancell?ed/i.test(String(error.message))) {
            return message;
        }

        toast.error(message, { ...toastConfig, toastId: 'error-toast' });
        return message;
    }
    
    const message = error instanceof Error ? error.message : defaultMessage;
    toast.error(message, { ...toastConfig, toastId: 'error-toast' });
    return message;
};

export const handleApiSuccess = (message: string) => {
    if (toast.isActive('success-toast')) {
        return;
    }
    toast.success(message, { ...toastConfig, toastId: 'success-toast' });
}; 