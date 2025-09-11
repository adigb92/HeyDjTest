import * as Yup from 'yup';

export const phoneNumberSchema = Yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .required('Phone number is required');

export const genderSchema = Yup.string()
    .oneOf(['male', 'female', 'other'], 'Please select a valid gender')
    .required('Gender is required');

export const emailSchema = Yup.string()
    .email('Invalid email')
    .required('Email is required');

export const nameSchema = Yup.string()
    .min(2, 'Too Short!')
    .max(50, 'Too Long!')
    .required('Name is required');

export const eventSchema = Yup.object().shape({
    eventName: Yup.string()
        .min(2, 'Too Short!')
        .max(100, 'Too Long!')
        .required('Event name is required'),
    eventLocation: Yup.string()
        .min(2, 'Too Short!')
        .max(200, 'Too Long!')
        .required('Event location is required'),
    eventDate: Yup.date()
        .required('Event date is required')
        .test('is-not-past', 'Event date cannot be in the past', function(value) {
            if (!value) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eventDate = new Date(value);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
        }),
});

export const genreSchema = Yup.object().shape({
    genre: Yup.string()
        .required('Genre is required'),
    youtubeLink: Yup.string()
        .url('Must be a valid YouTube URL')
        .required('YouTube link is required'),
});

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return passwordRegex.test(password);
};

export const validateName = (name: string): boolean => {
    return name.length >= 2 && name.length <= 50;
};

export const validateEventName = (name: string): boolean => {
    return name.length >= 3 && name.length <= 100;
};

export const validateEventDescription = (description: string): boolean => {
    return description.length >= 10 && description.length <= 1000;
};

export const validateEventDate = (date: string): boolean => {
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
}; 