// Define half-yearly periods with their respective months
const halfYearlyPeriods = [
    { id: 'half1', name: 'H1', months: ['January', 'February', 'March', 'April', 'May', 'June'], monthIndices: [0, 1, 2, 3, 4, 5] },
    { id: 'half2', name: 'H2', months: ['July', 'August', 'September', 'October', 'November', 'December'], monthIndices: [6, 7, 8, 9, 10, 11] }
];

let currentYearHalfYearly = new Date().getFullYear();

async function getHalfYearlyFeeStatus(halfId, year) {
    // Check if half-year is directly marked as paid
    if (paymentStatus.halfYearly && paymentStatus.halfYearly[halfId] === 'Paid') {
        return { status: 'Paid', statusClass: 'paid-status', textColor: 'text-green-800', showButton: false };
    }

    const period = halfYearlyPeriods.find(h => h.id === halfId);
    
    // Check if both quarters in the half-year are paid
    // H1 covers Q1 (1) and Q2 (2), H2 covers Q3 (3) and Q4 (4)
    const quartersInHalf = halfId === 'half1' ? [1, 2] : [3, 4];
    let allQuartersPaid = true;
    let anyQuarterPaid = false;
    
    for (let quarterNum of quartersInHalf) {
        if (paymentStatus.quarters && paymentStatus.quarters[quarterNum] === 'Paid') {
            anyQuarterPaid = true;
        } else {
            allQuartersPaid = false;
        }
    }
    
    // If both quarters are paid, show as fully paid (quarterly)
    if (allQuartersPaid && anyQuarterPaid) {
        return { status: 'Paid (Quarterly)', statusClass: 'paid-status', textColor: 'text-green-800', showButton: false };
    }
    
    // If only one quarter is paid, show as partially paid
    if (anyQuarterPaid) {
        return { status: 'Partially Paid (Quarterly)', statusClass: 'partial-status', textColor: 'text-blue-800', showButton: false };
    }
    
    // Check if all months in the half-year are paid individually
    let allMonthsPaid = true;
    for (let monthIndex of period.monthIndices) {
        if (!paymentStatus.months || paymentStatus.months[monthIndex] !== 'Paid') {
            allMonthsPaid = false;
            break;
        }
    }
    
    if (allMonthsPaid) {
        return { status: 'Paid (Monthly)', statusClass: 'paid-status', textColor: 'text-green-800', showButton: false };
    }

    // Check if any months in the half-year are paid
    let anyMonthPaid = false;
    for (let monthIndex of period.monthIndices) {
        if (paymentStatus.months && paymentStatus.months[monthIndex] === 'Paid') {
            anyMonthPaid = true;
            break;
        }
    }
    
    if (anyMonthPaid) {
        return { status: 'Partially Paid (Monthly)', statusClass: 'partial-status', textColor: 'text-blue-800', showButton: false };
    }

    // Get current date information
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentHalf = currentMonth < 6 ? 'half1' : 'half2';
    
    // Determine status based on date
    if (year < currentYear || (year === currentYear && (halfId === 'half1' || (halfId === 'half2' && currentHalf === 'half2')))) {
        return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-800', showButton: true };
    }
    
    return { status: 'Upcoming', statusClass: 'upcoming-status', textColor: 'text-gray-600', showButton: false };
}

async function createAllHalfYearlyCards(year) {
    const grid = document.getElementById('halfYearlyGrid');
    if (!grid) return;
    
    // Show loading spinner
    grid.innerHTML = `
        <div class="text-center col-span-2">
            <div class="loading-spinner"></div>
            <p class="mt-2 text-gray-600">Loading payment information...</p>
        </div>
    `;
    
    // Make sure payment status is up to date
    await fetchPaymentStatus();
    
    // Prepare all cards in a document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    // Create all half-yearly cards
    for (let period of halfYearlyPeriods) {
        const status = await getHalfYearlyFeeStatus(period.id, year);
        const lateFee = calculateHalfYearlyLateFee(period.id, year);
        
        const halfYearlyCard = document.createElement('div');
        halfYearlyCard.className = `halfyearly-card p-4 rounded-lg border ${status.statusClass}`;
        halfYearlyCard.id = `half-${period.id}-${year}`;
        
        if (status.showButton) {
            halfYearlyCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">${period.name} ${year}</h3>
                        <p class="text-xs text-gray-600 mt-1">${period.months.join(', ')}</p>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                        ${lateFee > 0 ? `<span class="text-xs text-red-600 block mt-1">Late fee: ₹${lateFee}</span>` : ''}
                    </div>
                    <button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" 
                            data-half="${period.id}" data-year="${year}">
                        Pay Now
                    </button>
                </div>
            `;
        } else {
            halfYearlyCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-semibold">${period.name} ${year}</h3>
                        <p class="text-xs text-gray-600 mt-1">${period.months.join(', ')}</p>
                        <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                    </div>
                </div>
            `;
        }
        
        fragment.appendChild(halfYearlyCard);
    }
    
    // Append all cards at once
    grid.innerHTML = '';
    grid.appendChild(fragment);
}

// Event delegation for half-yearly pay buttons
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('halfYearlyGrid');
    if (grid) {
        grid.addEventListener('click', (event) => {
            if (event.target.classList.contains('pay-now-btn')) {
                const halfId = event.target.getAttribute('data-half');
                const year = event.target.getAttribute('data-year');
                if (halfId && year) {
                    processHalfYearlyPayment(halfId, parseInt(year));
                }
            }
        });
    }
});

async function updateHalfYearlyGrid() {
    await createAllHalfYearlyCards(currentYearHalfYearly);
}

async function changeHalfYearlyYear(change) {
    currentYearHalfYearly += change;
    const yearElement = document.getElementById('currentYearHalfYearly');
    if (yearElement) yearElement.textContent = currentYearHalfYearly;
    await updateHalfYearlyGrid();
}

function calculateHalfYearlyLateFee(halfId, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    const period = halfYearlyPeriods.find(h => h.id === halfId);
    const firstMonthIndex = period.monthIndices[0]; // 0 for H1, 6 for H2
    
    // If payment is for a future year, no late fee
    if (year > currentYear) {
        return 0;
    }
    
    let monthsLate = 0;
    
    if (year < currentYear) {
        // Past year - calculate full year difference plus months in current year
        // For past years, all months in the period are late
        const yearsPassed = currentYear - year;
        // Add all months from the period's end to now
        monthsLate = (yearsPassed * 12) + currentMonth - firstMonthIndex - 1;
    } else if (year === currentYear) {
        // Current year - count from first month of period to current month (excluding current)
        // Formula: currentMonth - firstMonth - 1
        // Example: H1 (Jan=0), current Dec (11): 11 - 0 - 1 = 10 months
        // Example: H2 (Jul=6), current Dec (11): 11 - 6 - 1 = 4 months
        monthsLate = Math.max(0, currentMonth - firstMonthIndex - 1);
    }
    
    // Each month late adds ₹50
    return Math.max(0, monthsLate) * 50;
}

function processHalfYearlyPayment(halfId, year) {
    const lateFeeVariable = calculateHalfYearlyLateFee(halfId, year);
    const lateFee = parseInt(lateFeeVariable, 10) || 0;
    const halfYearlyFee = parseInt(window.halfYearlyFee, 10) || 0;
    const totalAmount = halfYearlyFee + lateFee;
    
    const period = halfYearlyPeriods.find(h => h.id === halfId);
    
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { 
            name: `Fee for ${period.name} ${year}${lateFee > 0 ? ' (Late Fee: ₹' + lateFee + ')' : ''}`, 
            amount: totalAmount, 
            description: `Fee for ${period.name} ${year} (${period.months.join(', ')})${lateFee > 0 ? ' including ₹' + lateFee + ' late fee' : ''}`,
            email: window.email, 
            contact: window.phoneNumber, 
            year, 
            halfId,
            isHalfYearly: true,
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
                                halfId,
                                isHalfYearly: true
                            },
                            success: async (updateRes) => {
                                alert('Payment successful!');
                                
                                // Update local payment status
                                if (!paymentStatus.halfYearly) {
                                    paymentStatus.halfYearly = {};
                                }
                                paymentStatus.halfYearly[halfId] = 'Paid';
                                
                                // Update individual months
                                if (!paymentStatus.months) {
                                    paymentStatus.months = {};
                                }
                                for (let monthIndex of period.monthIndices) {
                                    paymentStatus.months[monthIndex] = 'Paid';
                                }
                                
                                localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                                
                                // Refresh the UI
                                await updateHalfYearlyGrid();
                            },
                            error: (err) => {
                                console.error('Error updating payment status:', err);
                                alert('Payment was successful but there was an error updating the status. Please refresh the page.');
                            }
                        });
                    },
                    prefill: {
                        name: res.userName,
                        email: window.email,
                        contact: window.phoneNumber
                    },
                    theme: {
                        color: '#6B46C1'
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.open();
            }
        },
        error: (err) => {
            console.error('Error creating order:', err);
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

// Set up year navigation
document.addEventListener('DOMContentLoaded', function() {
    const prevYearBtn = document.getElementById('prevYearHalfYearly');
    const nextYearBtn = document.getElementById('nextYearHalfYearly');
    
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeHalfYearlyYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeHalfYearlyYear(1));
});
