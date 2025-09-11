import React from 'react';
import { Container } from 'react-bootstrap';

const PrivacyPolicy = () => {
    return (
        <Container className="mt-5">
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
                <li>Name and email address (when you register)</li>
                <li>Profile information (when you complete your profile)</li>
                <li>Music preferences and event information</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
                <li>Provide and maintain our services</li>
                <li>Improve user experience</li>
                <li>Communicate with you about your account</li>
                <li>Send you updates and notifications</li>
            </ul>

            <h2>3. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information.</p>

            <h2>4. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
            </ul>

            <h2>5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p>Email: support@heydj.com</p>
        </Container>
    );
};

export default PrivacyPolicy; 