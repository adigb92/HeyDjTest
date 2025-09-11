import React from 'react';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form as BootstrapForm, Alert } from 'react-bootstrap';
import { useForm } from '../hooks/useForm';
import { nameSchema, emailSchema, phoneNumberSchema, genderSchema } from '../utils/validation';
import LoadingSpinner from './LoadingSpinner';

interface RegistrationFormValues {
    name: string;
    email: string;
    phoneNumber: string;
    gender: string;
}

const RegistrationPage: React.FC = () => {
    const navigate = useNavigate();

    const { loading, error, handleSubmit, initialValues } = useForm<RegistrationFormValues>({
        initialValues: {
                    name: '',
                    email: '',
                    phoneNumber: '',
                    gender: '',
        },
        endpoint: '/user/register',
        onSuccess: () => navigate('/genre-selection')
    });

    const validationSchema = Yup.object().shape({
        name: nameSchema,
        email: emailSchema,
        phoneNumber: phoneNumberSchema,
        gender: genderSchema,
    });

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h1" className="text-center mb-4">Registration</Card.Title>
                            
                            {error && (
                                <Alert variant="danger" className="mb-4">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </Alert>
                            )}

                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={handleSubmit}
            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <BootstrapForm.Group className="mb-3">
                                            <BootstrapForm.Label>Name</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="text"
                                                name="name"
                                                placeholder="Enter your name"
                                                isInvalid={errors.name && touched.name}
                                            />
                                            {errors.name && touched.name && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {errors.name}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-3">
                                            <BootstrapForm.Label>Email</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="email"
                                                name="email"
                                                placeholder="Enter your email"
                                                isInvalid={errors.email && touched.email}
                                            />
                                            {errors.email && touched.email && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {errors.email}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-3">
                                            <BootstrapForm.Label>Phone Number</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="tel"
                                                name="phoneNumber"
                                                placeholder="Enter your phone number (10 digits)"
                                                isInvalid={errors.phoneNumber && touched.phoneNumber}
                                            />
                                            {errors.phoneNumber && touched.phoneNumber && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {errors.phoneNumber}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-3">
                                            <BootstrapForm.Label>Gender</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Select}
                                                name="gender"
                                                isInvalid={errors.gender && touched.gender}
                                            >
                                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                            </Field>
                                            {errors.gender && touched.gender && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    {errors.gender}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <div className="d-grid">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                disabled={isSubmitting || loading}
                                                className="mb-3"
                                            >
                                                {isSubmitting || loading ? (
                                                    <>
                                                        <LoadingSpinner size={20} variant="bootstrap" />
                                                        <span className="ms-2">Registering...</span>
                                                    </>
                                                ) : 'Register'}
                                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>

                            <div className="text-center">
                                <p className="text-muted mb-3">Or register with:</p>
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

export default RegistrationPage;
