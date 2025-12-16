// LEGACY CODE: Monthly Payment System
// This file contains the original monthly payment logic that has been replaced by quarterly and half-yearly payment systems

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentYear = new Date().getFullYear();

// Optimized function to create all month cards at once
async function createAllMonthCards(year) {
    const grid = document.getElementById('monthsGrid');
    if (!grid) return;
    
    // Show loading spinner
    grid.innerHTML = `
    <div class="text-center">
        <div class="loading-spinner"></div>
        <p class="mt-2 text-gray-600">Loading payment information...</p>
    </div>
`;
    
    await fetchPaymentStatus();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < months.length; i++) {
        const month = months[i];
        let status = { 
            status: 'Upcoming', 
            statusClass: 'upcoming-status', 
            textColor: 'text-gray-600', 
            showButton: false 
        };

        if (year < currentYear || (paymentStatus.months && paymentStatus.months[i] === 'Paid')) {
            status = { 
                status: 'Paid', 
                statusClass: 'paid-status', 
                textColor: 'text-green-800', 
                showButton: false 
            };
        } else {
            const quarter = Math.floor(i / 3) + 1;
            if (paymentStatus.quarters && paymentStatus.quarters[quarter] === 'Paid') {
                status = { 
                    status: 'Paid (Quarterly)', 
                    statusClass: 'paid-status', 
                    textColor: 'text-green-800', 
                    showButton: false 
                };
            } else if ((year === currentYear && i <= currentMonth)) {
                status = { 
                    status: 'Pending', 
                    statusClass: 'pending-status', 
                    textColor: 'text-orange-800', 
                    showButton: true 
                };
            }
        }

        const monthCard = document.createElement('div');
        monthCard.className = `month-card p-4 rounded-lg border ${status.statusClass}`;
        monthCard.id = `month-${month.toLowerCase()}-${year}`;
        
        if (status.showButton) {
            const lateFee = calculateLateFee(i, year);
            monthCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">${month} ${year}</h3>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                        ${lateFee > 0 ? `<span class="text-xs text-red-600 block mt-1">Late fee: ₹${lateFee}</span>` : ''}
                    </div>
                    <button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" 
                            data-month="${i}" data-year="${year}">
                        Pay Now
                    </button>
                </div>
            `;
        } else {
            monthCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">${month} ${year}</h3>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                    </div>
                </div>
            `;
        }
        
        fragment.appendChild(monthCard);
    }
    grid.innerHTML = '';
    grid.appendChild(fragment);
}

// Event delegation for monthly payment buttons
document.addEventListener('DOMContentLoaded', function() {
    const monthsGrid = document.getElementById('monthsGrid');
    if (monthsGrid) {
        monthsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('pay-now-btn')) {
                // Get month and year from data attributes
                const monthIndex = event.target.getAttribute('data-month');
                const year = event.target.getAttribute('data-year');

                if (monthIndex !== null && year !== null) {
                    processPayment(months[monthIndex], parseInt(year));
                }
            }
        });
    }
});

// Update months grid function
async function updateMonthsGrid() {
    await createAllMonthCards(currentYear);
    updateYearSummary();
}

async function changeYear(change) {
    currentYear += change;
    const yearElement = document.getElementById('currentYear');
    if (yearElement) yearElement.textContent = currentYear;
    await updateMonthsGrid();
    updateYearSummary();
}

function calculateLateFee(monthIndex, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // If payment is for a future month, no late fee
    if (year > currentYear || (year === currentYear && monthIndex > currentMonth)) {
        return 0;
    }
    
    // Calculate months late
    const monthsLate = (currentYear - year) * 12 + (currentMonth - monthIndex);
    
    // Cap at 0 (shouldn't be negative)
    return Math.max(0, monthsLate) * 50;
}

function processPayment(month, year) {
    const monthIndex = months.indexOf(month);
    const lateFeeVariable = calculateLateFee(monthIndex, year);
    const lateFee = parseInt(lateFeeVariable, 10) || 0;
    const monthlyFee = parseInt(window.monthlyFee, 10) || 0;
    const totalAmount = monthlyFee + lateFee;
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { 
            name: `Fee for ${month} ${year}${lateFee > 0 ? ' (Late Fee: ₹' + lateFee + ')' : ''}`, 
            amount:totalAmount, 
            description: `Fee for ${month} ${year}${lateFee > 0 ? ' including ₹' + lateFee + ' late fee' : ''}`, 
            email: window.email, 
            contact: window.phoneNumber, 
            year, 
            month: monthIndex, 
            isQuarterly: false,
            lateFee: lateFee
        },
        success: (res) => {
            if (res.success) {
                const options = {
                    key: res.key_id,
                    amount: res.amount,
                    currency: 'INR',
                    order_id: res.order_id,
                    handler: async (response) => {
                        await $.ajax({
                            url: '/update-payment',
                            type: 'POST',
                            data: { 
                                userId: window.userId, 
                                year, 
                                month: monthIndex, 
                                isQuarterly: false 
                            },
                            success: async () => {
                                // Update local storage payment status
                                if (!paymentStatus.months) {
                                    paymentStatus.months = {};
                                }
                                paymentStatus.months[monthIndex] = 'Paid';
                                localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                                
                                // Update only the specific month card instead of regenerating all cards
                                const monthCard = document.getElementById(`month-${month.toLowerCase()}-${year}`);
                                if (monthCard) {
                                    monthCard.className = 'month-card p-4 rounded-lg border paid-status';
                                    const statusSpan = monthCard.querySelector('span');
                                    if (statusSpan) {
                                        statusSpan.className = 'text-sm font-medium text-green-700';
                                        statusSpan.textContent = 'Paid';
                                    }
                                    
                                    // Remove the pay button if it exists
                                    const payButton = monthCard.querySelector('.pay-now-btn');
                                    if (payButton) {
                                        payButton.remove();
                                    }
                                }
                                
                                // Update summary
                                updateYearSummary();
                                if (typeof updateQuarterlyAfterMonthlyPayment === 'function') {
                                    updateQuarterlyAfterMonthlyPayment(monthIndex);
                                }
                                alert(`Payment Successful for ${month} ${year}`);
                            }
                        });
                    },
                    prefill: { contact: res.contact, name: res.name, email: res.email },
                    theme: { color: '#6B46C1' }
                };
                new Razorpay(options).open();
            }
        },
        error: (err) => {
            // Check if there's a specific error message from the server
            let errorMessage = 'There was an error processing your payment. Please try again later.';
            
            if (err.responseJSON && err.responseJSON.msg) {
                errorMessage = err.responseJSON.msg;
            } else if (err.responseText) {
                try {
                    const response = JSON.parse(err.responseText);
                    if (response.msg) {
                        errorMessage = response.msg;
                    }
                } catch (e) {
                    // If parsing fails, use default message
                }
            }
            
            alert(errorMessage);
        }
    });
}

// Initialize monthly payment UI when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Initial fetch of payment status
    if (typeof fetchPaymentStatus === 'function') {
        await fetchPaymentStatus();
    }
    
    // Set current year from actual date
    currentYear = new Date().getFullYear();
    
    // Set up year navigation for monthly view
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
    const yearElement = document.getElementById('currentYear');
    
    if (yearElement) yearElement.textContent = currentYear;
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeYear(1));
    
    // Initialize UI
    await updateMonthsGrid();
    if (typeof updateYearSummary === 'function') {
        updateYearSummary();
    }
});
