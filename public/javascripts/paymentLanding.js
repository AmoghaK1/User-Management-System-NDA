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

const feeModeFactor = {
    full: 1,
    half: 0.5,
    skip: 0
};

// Fetch the user's payment status from the server
async function fetchPaymentStatus(year = null) {
    try {
        const url = year ? `/payment-status?year=${year}` : '/payment-status';
        const response = await $.ajax({
            url: url,
            type: 'GET'
        });

        if (response && response.success) {
            paymentStatus = response.paymentStatus;
            console.log('Payment status fetched for year:', paymentStatus.year, paymentStatus);
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

function getMonthModeFromSettings(monthIndex) {
    if (!window.monthFeeSettings || !Array.isArray(window.monthFeeSettings.months)) {
        return 'full';
    }

    const monthItem = window.monthFeeSettings.months.find((month) => month.index === monthIndex);
    if (!monthItem || !feeModeFactor.hasOwnProperty(monthItem.mode)) {
        return 'full';
    }

    return monthItem.mode;
}

function calculateAmountForMonthIndices(monthIndices) {
    const monthlyFee = parseFloat(window.monthlyFee) || 0;
    return monthIndices.reduce((total, monthIndex) => {
        const mode = getMonthModeFromSettings(monthIndex);
        const multiplier = feeModeFactor[mode] || 1;
        return total + (monthlyFee * multiplier);
    }, 0);
}

// Initialize payment status when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Fetch payment status for landing page
    await fetchPaymentStatus();
});
