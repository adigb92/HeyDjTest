import { useState, useCallback } from 'react';
import { FormikHelpers } from 'formik';
import { handleApiError, handleApiSuccess } from '../utils/errorHandler';
import { post } from '../utils/apiClient';

interface ApiResponse {
    message: string;
    [key: string]: any;
}

interface UseFormOptions<T> {
    initialValues: T;
    endpoint: string;
    onSuccess?: (response: ApiResponse) => void;
    onError?: (error: any) => void;
}

export const useForm = <T extends object>({
    initialValues,
    endpoint,
    onSuccess,
    onError
}: UseFormOptions<T>) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async (
        values: T,
        { setSubmitting, resetForm }: FormikHelpers<T>
    ) => {
        setLoading(true);
        setError(null);
        try {
            const response = await post<ApiResponse>(endpoint, values);
            handleApiSuccess(response.message);
            if (onSuccess) onSuccess(response);
            resetForm();
        } catch (error) {
            const errorMessage = handleApiError(error);
            setError(errorMessage);
            if (onError) onError(error);
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    }, [endpoint, onSuccess, onError]);

    return {
        loading,
        error,
        handleSubmit,
        initialValues
    };
}; 