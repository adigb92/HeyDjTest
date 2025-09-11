import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Field, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Container, Row, Col, Card, Button, Form as BootstrapForm, Alert } from 'react-bootstrap';
import { useForm } from '../hooks/useForm';
import { eventSchema, nameSchema } from '../utils/validation';
import LoadingSpinner from './LoadingSpinner';
import { get, put } from '../utils/apiClient';
import { handleApiError, handleApiSuccess } from '../utils/errorHandler';

interface Event {
    djName: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

interface EventFormValues {
    djName: string;
    eventName: string;
    eventLocation: string;
    eventDate: string;
}

const DJEventEditPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await get<Event>(`/events/${id}`);
                setEvent(response);
            } catch (error) {
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    const { loading: submitting, error, initialValues } = useForm<EventFormValues>({
        initialValues: event || {
            djName: '',
            eventName: '',
            eventLocation: '',
            eventDate: '',
        },
        endpoint: `/events/${id}`,
        onSuccess: () => {
            navigate('/dj-events-list');
        }
    });

    const validationSchema = Yup.object().shape({
        ...eventSchema.fields,
        djName: nameSchema,
    });

    const handleFormSubmit = async (values: EventFormValues, formikHelpers: FormikHelpers<EventFormValues>) => {
        try {
            await put(`/events/${id}`, values);
            handleApiSuccess('Event updated successfully!');
            navigate('/dj-events-list');
        } catch (error) {
            handleApiError(error);
        } finally {
            formikHelpers.setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} md={8} lg={6}>
                        <div className="text-center">
                            <LoadingSpinner size={40} variant="bootstrap" />
                            <p className="mt-3">Loading event details...</p>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }

    if (!event) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col xs={12} md={8} lg={6}>
                        <Alert variant="warning">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            Event not found
                        </Alert>
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
                            <Card.Title as="h2" className="text-center mb-4">Edit Event</Card.Title>
                            
                            {error && (
                                <Alert variant="danger" className="mb-4">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    {error}
                                </Alert>
                            )}

            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={handleFormSubmit}
                            >
                                {({ isSubmitting, errors, touched }) => (
                    <Form>
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

                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                disabled={isSubmitting || submitting}
                                                size="lg"
                                                className="flex-grow-1 py-2"
                                            >
                                                {isSubmitting || submitting ? (
                                                    <>
                                                        <LoadingSpinner size={20} variant="bootstrap" />
                                                        <span className="ms-2">Updating Event...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-save-fill me-2"></i>
                                                        Update Event
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => navigate('/dj-events-list')}
                                                size="lg"
                                                className="py-2"
                                            >
                                                <i className="bi bi-x-circle-fill me-2"></i>
                                                Cancel
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

export default DJEventEditPage;
