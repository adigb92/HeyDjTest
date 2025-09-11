import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from './UserContext';
import { post } from '../utils/apiClient';
import { handleApiError, handleApiSuccess } from '../utils/errorHandler';
import LoadingSpinner from './LoadingSpinner';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import * as Yup from 'yup';

const emailSchema = Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required');

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, loading: authLoading, updateUser } = useContext(UserContext);

    useEffect(() => {
        if (user) {
            // If user is authenticated via OAuth and hasn't completed profile, go to profile completion
            if (user.authProvider && !user.isProfileComplete) {
                navigate('/profile-completion');
            } else {
                    navigate('/genre-selection');
                }
        }
    }, [user, navigate]);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            await emailSchema.validate(email);
            const response = await post<{ user: any; message: string; token: string }>('/user/login', { email });
            
            // Store the token
            if (response.token) {
                localStorage.setItem('token', response.token);
            }
            
            updateUser(response.user);
            handleApiSuccess(response.message);
            
            // If user is authenticated via OAuth and hasn't completed profile, go to profile completion
            if (response.user.authProvider && !response.user.isProfileComplete) {
                navigate('/profile-completion');
            } else {
                navigate('/genre-selection');
            }
        } catch (error) {
            if (error instanceof Yup.ValidationError) {
                setError(error.message);
            } else {
                setError(handleApiError(error));
            }
        } finally {
            setLoading(false);
            }
    };

    if (authLoading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        <LoadingSpinner size={40} variant="bootstrap" />
                        <p className="mt-3">Checking authentication...</p>
                    </Col>
                </Row>
            </Container>
        );
        }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h1" className="text-center mb-4">Login</Card.Title>
                            
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        isInvalid={!!error}
                                    />
                                </Form.Group>

                                <div className="d-grid">
                                    <Button 
                                        variant="success" 
                                        type="submit"
                                        disabled={loading}
                                        className="mb-3"
                                    >
                                        {loading ? (
                                            <>
                                                <LoadingSpinner size={20} variant="bootstrap" />
                                                <span className="ms-2">Logging in...</span>
                                            </>
                                        ) : 'Login'}
                                    </Button>
                </div>
                            </Form>

                            <div className="text-center mb-3">
                                <p className="text-muted">Or login with:</p>
                                <div className="d-flex justify-content-center gap-2">
                                    <Button 
                                        variant="danger"
                                        onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/user/auth/google`}
                                    >
                                        <i className="bi bi-google me-2"></i>
                                        Google
                                    </Button>
                                    <Button 
                                        variant="primary"
                                        onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/user/auth/facebook`}
                                    >
                                        <i className="bi bi-facebook me-2"></i>
                                        Facebook
                                    </Button>
            </div>
        </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LoginPage;
