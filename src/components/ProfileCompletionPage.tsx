import React from 'react';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form as BootstrapForm, Alert } from 'react-bootstrap';
import { useForm } from '../hooks/useForm';
import { phoneNumberSchema, genderSchema } from '../utils/validation';
import LoadingSpinner from './LoadingSpinner';

interface ProfileFormValues {
    phoneNumber: string;
    gender: string;
}

const ProfileCompletionPage: React.FC = () => {
    const navigate = useNavigate();

    const { loading, error, handleSubmit, initialValues } = useForm<ProfileFormValues>({
        initialValues: {
            phoneNumber: '',
            gender: '',
        },
        endpoint: '/user/update-profile',
        onSuccess: () => navigate('/confirmation')
    });

    const validationSchema = Yup.object().shape({
        phoneNumber: phoneNumberSchema,
        gender: genderSchema,
    });

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h2" className="text-center mb-4">Complete Your Profile</Card.Title>
                            <Card.Text className="text-center text-muted mb-4">
                                Please provide your phone number and gender to complete your profile setup.
                            </Card.Text>
                            
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
                                        <BootstrapForm.Group className="mb-4">
                                            <BootstrapForm.Label className="fw-bold">Phone Number</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                type="tel"
                                                name="phoneNumber"
                                                placeholder="Enter your phone number (10 digits)"
                                                isInvalid={errors.phoneNumber && touched.phoneNumber}
                                                className="py-2"
                                            />
                                            {errors.phoneNumber && touched.phoneNumber && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.phoneNumber}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-4">
                                            <BootstrapForm.Label className="fw-bold">Gender</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Select}
                                                name="gender"
                                                isInvalid={errors.gender && touched.gender}
                                                className="py-2"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                            </Field>
                                            {errors.gender && touched.gender && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.gender}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                        <div className="d-grid">
                            <Button
                                variant="primary"
                                type="submit"
                                                disabled={isSubmitting || loading}
                                                size="lg"
                                                className="py-2"
                            >
                                                {isSubmitting || loading ? (
                                                    <>
                                                        <LoadingSpinner size={20} variant="bootstrap" />
                                                        <span className="ms-2">Completing Profile...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-check-circle-fill me-2"></i>
                                                        Complete Profile
                                                    </>
                                                )}
                            </Button>
                        </div>
                    </Form>
                                )}
                            </Formik>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ProfileCompletionPage;
