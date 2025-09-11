import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
    size?: number;
    color?: 'primary' | 'secondary' | 'inherit';
    fullScreen?: boolean;
    variant?: 'mui' | 'bootstrap';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 40,
    color = 'primary',
    fullScreen = false,
    variant = 'mui'
}) => {
    const spinner = variant === 'mui' ? (
        <CircularProgress
            size={size}
            color={color}
        />
    ) : (
        <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
        </Spinner>
    );

    if (fullScreen) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                width="100%"
            >
                {spinner}
            </Box>
        );
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            p={2}
        >
            {spinner}
        </Box>
    );
};

export default LoadingSpinner; 