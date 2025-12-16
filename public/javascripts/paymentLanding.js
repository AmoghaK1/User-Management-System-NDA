// Shared utilities for payment landing page and payment status fetching
// Used by quarterly and half-yearly payment pages

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Global variable to store payment status - accessible by all payment pages
var paymentStatus = {
    months: {},
    quarters: {},
    halfYearly: {}
};

// Fetch the user's payment status from the server
async function fetchPaymentStatus() {
    try {
        const response = await $.ajax({
            url: '/payment-status',
            type: 'GET'
        });

        if (response && response.success) {
            paymentStatus = response.paymentStatus;
            console.log('Payment status fetched:', paymentStatus); // Debug log
            localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
        }
    } catch (error) {
        console.error('Error fetching payment status:', error);
    }
}

function getCurrentDate() {
    const currentDate = new Date();
    return {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
    };
}

// Initialize payment status when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Fetch payment status for landing page
    await fetchPaymentStatus();
});
