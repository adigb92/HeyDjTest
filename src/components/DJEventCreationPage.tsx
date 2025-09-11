import React from 'react';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form as BootstrapForm, Alert } from 'react-bootstrap';
import { useForm } from '../hooks/useForm';
import { eventSchema, nameSchema } from '../utils/validation';
import LoadingSpinner from './LoadingSpinner';
import { AppUser } from '../interfaces/types';

interface EventFormValues {
    eventName: string;
    eventLocation: string;
    eventDate: string;
    djName: string;
}

interface DJEventCreationPageProps {
    currentUser: AppUser;
}

const DJEventCreationPage: React.FC<DJEventCreationPageProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { loading, error, handleSubmit, initialValues } = useForm<EventFormValues>({
        initialValues: {
                    eventName: '',
                    eventLocation: '',
                    eventDate: '',
            djName: currentUser.name || '',
        },
        endpoint: '/events',
        onSuccess: () => {
            navigate('/dj-events-list');
        },
        onError: (error) => {
                    if (!currentUser.isAdmin) {
                return "You must be an admin to create an event.";
            }
            return error;
                    }
    });

    const validationSchema = Yup.object().shape({
        ...eventSchema.fields,
        djName: nameSchema,
    });

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col xs={12} md={8} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h2" className="text-center mb-4">Create Event</Card.Title>
                            
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
                                            <BootstrapForm.Label className="fw-bold">Event Name</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="text"
                                                name="eventName"
                                                placeholder="Enter event name"
                                                isInvalid={errors.eventName && touched.eventName}
                                                className="py-2"
                                            />
                                            {errors.eventName && touched.eventName && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.eventName}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-4">
                                            <BootstrapForm.Label className="fw-bold">DJ Name</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="text"
                                                name="djName"
                                                placeholder="Enter DJ name"
                                                isInvalid={errors.djName && touched.djName}
                                                className="py-2"
                                            />
                                            {errors.djName && touched.djName && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.djName}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-4">
                                            <BootstrapForm.Label className="fw-bold">Event Location</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="text"
                                                name="eventLocation"
                                                placeholder="Enter event location"
                                                isInvalid={errors.eventLocation && touched.eventLocation}
                                                className="py-2"
                                            />
                                            {errors.eventLocation && touched.eventLocation && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.eventLocation}
                                                </BootstrapForm.Control.Feedback>
                                            )}
                                        </BootstrapForm.Group>

                                        <BootstrapForm.Group className="mb-4">
                                            <BootstrapForm.Label className="fw-bold">Event Date</BootstrapForm.Label>
                                            <Field
                                                as={BootstrapForm.Control}
                                                type="date"
                                                name="eventDate"
                                                isInvalid={errors.eventDate && touched.eventDate}
                                                className="py-2"
                                            />
                                            {errors.eventDate && touched.eventDate && (
                                                <BootstrapForm.Control.Feedback type="invalid">
                                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                                    {errors.eventDate}
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
                                                        <span className="ms-2">Creating Event...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-plus-circle-fill me-2"></i>
                                                        Create Event
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

export default DJEventCreationPage;
