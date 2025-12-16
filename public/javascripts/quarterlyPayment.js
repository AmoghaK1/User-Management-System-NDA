// Define quarters with their respective months
const quarters = [
    { id: 1, name: 'Q1', months: ['January', 'February', 'March'] },
    { id: 2, name: 'Q2', months: ['April', 'May', 'June'] },
    { id: 3, name: 'Q3', months: ['July', 'August', 'September'] },
    { id: 4, name: 'Q4', months: ['October', 'November', 'December'] }
];

let currentYear = new Date().getFullYear();

async function getQuarterlyFeeStatus(quarter, year) {
    // Get current date information first
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    // If it's a future year, all quarters are upcoming
    if (year > currentYear) {
        return { status: 'Upcoming', statusClass: 'upcoming-status', textColor: 'text-gray-600', showButton: false };
    }
    
    // If it's current year but future quarter, it's upcoming
    if (year === currentYear && quarter > currentQuarter) {
        return { status: 'Upcoming', statusClass: 'upcoming-status', textColor: 'text-gray-600', showButton: false };
    }
    
    // IMPORTANT: Only check payment status if it's for the same year
    // If paymentStatus doesn't exist or is for a different year, treat as pending
    if (!paymentStatus || !paymentStatus.year || paymentStatus.year !== year) {
        return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-800', showButton: true };
    }
    
    // Now check if quarter is directly marked as paid
    if (paymentStatus.quarters && paymentStatus.quarters[quarter] === 'Paid') {
        return { status: 'Paid', statusClass: 'paid-status', textColor: 'text-green-800', showButton: false };
    }

    // Calculate month range for this quarter
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    
    // Check if all months in the quarter are paid individually
    let allMonthsPaid = true;
    for (let i = startMonth; i <= endMonth; i++) {
        if (!paymentStatus.months || paymentStatus.months[i] !== 'Paid') {
            allMonthsPaid = false;
            break;
        }
    }
    
    if (allMonthsPaid) {
        return { status: 'Paid (Monthly)', statusClass: 'paid-status', textColor: 'text-green-800', showButton: false };
    }

    // Check if any months in the quarter are paid
    let anyMonthPaid = false;
    for (let i = startMonth; i <= endMonth; i++) {
        if (paymentStatus.months && paymentStatus.months[i] === 'Paid') {
            anyMonthPaid = true;
            break;
        }
    }
    
    if (anyMonthPaid) {
        return { status: 'Partially Paid', statusClass: 'partial-status', textColor: 'text-blue-800', showButton: true };
    }

    // For past or current quarter that's not paid, it's pending
    return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-800', showButton: true };
}

async function createAllQuarterlyCards(year) {
    const grid = document.getElementById('quarterlyGrid');
    if (!grid) return;
    
    // Show loading spinner
    grid.innerHTML = `
    <div class="text-center">
        <div class="loading-spinner"></div>
        <p class="mt-2 text-gray-600">Loading payment information...</p>
    </div>
`;
    
    // Make sure payment status is up to date
    await fetchPaymentStatus();
    
    // Prepare all cards in a document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    // Create all quarterly cards at once
    for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterObj = quarters.find(q => q.id === quarter);
        const status = await getQuarterlyFeeStatus(quarter, year);
        const lateFee = calculateQuarterlyLateFee(quarter, year);
        
        const quarterlyCard = document.createElement('div');
        quarterlyCard.className = `quarterly-card p-4 rounded-lg border ${status.statusClass}`;
        quarterlyCard.id = `quarter-${quarter}-${year}`;
        
        if (status.showButton) {
            quarterlyCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">Q${quarter} ${year} (${quarterObj.months.join(', ')})</h3>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                        ${lateFee > 0 ? `<span class="text-xs text-red-600 block mt-1">Late fee: ₹${lateFee}</span>` : ''}
                    </div>
                    <button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" 
                            data-quarter="${quarter}" data-year="${year}">
                        Pay Now
                    </button>
                </div>
            `;
        } else {
            quarterlyCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">Q${quarter} ${year} (${quarterObj.months.join(', ')})</h3>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                    </div>
                </div>
            `;
        }
        
        fragment.appendChild(quarterlyCard);
    }
    
    // Append all cards at once
    grid.innerHTML = '';
    grid.appendChild(fragment);
}

// Event delegation for quarterly pay buttons
document.getElementById('quarterlyGrid').addEventListener('click', (event) => {
    if (event.target.classList.contains('pay-now-btn')) {
        const quarter = event.target.getAttribute('data-quarter');
        const year = event.target.getAttribute('data-year');
        if (quarter !== null && year !== null) {
            processQuarterlyPayment(parseInt(quarter), parseInt(year));
        }
    }
});

async function updateQuarterlyGrid() {
    await fetchPaymentStatus(currentYear);
    await createAllQuarterlyCards(currentYear);
    updateQuarterlySummary();
    
    // Toggle prev button visibility based on year
    const prevBtn = document.getElementById('prevYearQuarterly');
    if (prevBtn) {
        prevBtn.style.display = currentYear <= 2025 ? 'none' : 'block';
    }
}

async function changeQuarterlyYear(change) {
    const newYear = currentYear + change;
    // Don't allow going below 2025
    if (newYear < 2025) {
        return;
    }
    currentYear = newYear;
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
    await updateQuarterlyGrid();
}

function calculateQuarterlyLateFee(quarter, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    // If payment is for a future quarter, no late fee
    if (year > currentYear || (year === currentYear && quarter > currentQuarter)) {
        return 0;
    }
    
    // Calculate months late based on last month of the quarter
    const lastMonthOfQuarter = (quarter * 3) - 1; // March=2, June=5, etc.
    let monthsLate = (currentYear - year) * 12 + (currentMonth - lastMonthOfQuarter);
    
    // For current quarter, only count months that have passed
    if (year === currentYear && quarter === currentQuarter) {
        monthsLate = Math.max(0, currentMonth - lastMonthOfQuarter + 2); // +2 because we count from the first month of the quarter
    }
    
    // Cap at 0 (shouldn't be negative) and multiply by 50
    return Math.max(0, monthsLate) * 50;
}

function processQuarterlyPayment(quarter, year) {
    const lateFeeVariable = calculateQuarterlyLateFee(quarter, year);
    const lateFee = parseInt(lateFeeVariable, 10) || 0;
    const quarterlyFee = parseInt(window.quarterlyFee, 10) || 0;
    const totalAmount = quarterlyFee + lateFee;
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { 
            name: `Fee for Q${quarter} ${year}${lateFee > 0 ? ' (Late Fee: ₹' + lateFee + ')' : ''}`, 
            amount: totalAmount, 
            description: `Fee for Q${quarter} ${year}${lateFee > 0 ? ' including ₹' + lateFee + ' late fee' : ''}`,
            email: window.email, 
            contact: window.phoneNumber, 
            year, 
            quarter, 
            isQuarterly: true,
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
                                quarter, 
                                isQuarterly: true,
                                lateFee: lateFee
                            },
                            success: async () => {
                                // Update local storage payment status
                                if (!paymentStatus.quarters) {
                                    paymentStatus.quarters = {};
                                }
                                paymentStatus.quarters[quarter] = 'Paid';
                                
                                // Mark all months in this quarter as paid
                                if (!paymentStatus.months) {
                                    paymentStatus.months = {};
                                }
                                const startMonth = (quarter - 1) * 3;
                                for (let i = startMonth; i < startMonth + 3; i++) {
                                    paymentStatus.months[i] = 'Paid';
                                }
                                
                                localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                                
                                // Update only the specific quarter card
                                const quarterCard = document.getElementById(`quarter-${quarter}-${year}`);
                                if (quarterCard) {
                                    quarterCard.className = 'quarterly-card p-4 rounded-lg border paid-status';
                                    const statusSpan = quarterCard.querySelector('span');
                                    if (statusSpan) {
                                        statusSpan.className = 'text-sm font-medium text-green-800';
                                        statusSpan.textContent = 'Paid';
                                    }
                                    
                                    // Remove the pay button if it exists
                                    const payButton = quarterCard.querySelector('.pay-now-btn');
                                    if (payButton) {
                                        payButton.remove();
                                    }
                                    
                                    // Remove late fee display if it exists
                                    const lateFeeSpan = quarterCard.querySelector('.text-xs.text-red-600');
                                    if (lateFeeSpan) {
                                        lateFeeSpan.remove();
                                    }
                                }
                                
                                // Update summaries
                                updateQuarterlySummary();
                                updateYearSummary();
                                alert(`Payment Successful for Q${quarter} ${year}`);
                            },
                            error: (err) => {
                                console.error('Payment update error:', err);
                                alert('Payment was processed, but there was an error updating your account. Please contact support.');
                            }
                        });
                    },
                    prefill: { 
                        contact: res.contact, 
                        name: res.name, 
                        email: res.email 
                    },
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

// Summary update functions (optional - for UI updates)
function updateQuarterlySummary() {
    // Optional: Add summary statistics if needed in the UI
    // Currently just a placeholder to prevent errors
}

function updateYearSummary() {
    // Optional: Add year summary statistics if needed
    // Currently just a placeholder to prevent errors
}

// Initialize quarterly payment view
document.addEventListener('DOMContentLoaded', async function() {
    // Set current year in UI
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
    
    // Set up event listeners for year navigation
    const prevYearBtn = document.getElementById('prevYearQuarterly');
    const nextYearBtn = document.getElementById('nextYearQuarterly');
    
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeQuarterlyYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeQuarterlyYear(1));
    
    // Update the UI
    await updateQuarterlyGrid();
    updateQuarterlySummary();
});