/*
 * Quick SendGrid verification script.
 * Usage:
 *  TEST_EMAIL="recipient@example.com" node scripts/sendgridHealthCheck.js
 * Reads SENDGRID_API_KEY and AUTH_EMAIL from the environment.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const sgMail = require('../config/sendgrid');

const recipient = process.env.TEST_EMAIL;

if (!recipient) {
    console.error('❌ TEST_EMAIL environment variable is required.');
    process.exit(1);
}

(async () => {
    console.log('🔍 Attempting to send SendGrid health-check email...');
    console.log('   From:', process.env.AUTH_EMAIL);
    console.log('   To  :', recipient);

    try {
        const [response] = await sgMail.send({
            to: recipient,
            from: process.env.AUTH_EMAIL,
            subject: 'SendGrid health check',
            text: 'If you can read this, SendGrid is working in production.',
            html: '<p>If you can read this, SendGrid is working in production.</p>'
        });

        console.log('✅ Health check mail dispatched. Response status:', response && response.statusCode);
        if (response && response.headers) {
            console.log('📬 Response headers:', JSON.stringify(response.headers, null, 2));
        }
    } catch (error) {
        console.error('❌ SendGrid health check failed:', error.message || error);
        if (error.response) {
            console.error('   Status code:', error.response.statusCode);
            console.error('   Body       :', JSON.stringify(error.response.body, null, 2));
            console.error('   Headers    :', JSON.stringify(error.response.headers, null, 2));
        }
        process.exit(1);
    }
})();
