// Use the same currentYear from the monthly code instead of redefining it

// Define quarters with their respective months
const quarters = [
    { id: 1, name: 'Q1', months: ['January', 'February', 'March'] },
    { id: 2, name: 'Q2', months: ['April', 'May', 'June'] },
    { id: 3, name: 'Q3', months: ['July', 'August', 'September'] },
    { id: 4, name: 'Q4', months: ['October', 'November', 'December'] }
];

// We'll use the fetchPaymentStatus() function from the monthly code

async function updateQuarterlyAfterMonthlyPayment(monthIndex) {
    // Check if all months in a quarter are paid
    const quarter = Math.floor(monthIndex / 3) + 1;
    const startMonth = (quarter - 1) * 3;
    let allPaid = true;
    
    for (let i = startMonth; i < startMonth + 3; i++) {
        if (!paymentStatus.months || paymentStatus.months[i] !== 'Paid') {
            allPaid = false;
            break;
        }
    }
    
    // If all months in a quarter are paid, mark the quarter as paid
    if (allPaid && (!paymentStatus.quarters || paymentStatus.quarters[quarter] !== 'Paid')) {
        if (!paymentStatus.quarters) {
            paymentStatus.quarters = {};
        }
        paymentStatus.quarters[quarter] = 'Paid';
        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
        
        // Update the quarterly card
        const quarterCard = document.getElementById(`quarter-${quarter}-${currentYear}`);
        if (quarterCard) {
            quarterCard.className = 'quarterly-card p-4 rounded-lg border paid-status';
            const statusSpan = quarterCard.querySelector('span');
            if (statusSpan) {
                statusSpan.className = 'text-sm font-medium text-green-700';
                statusSpan.textContent = 'Paid';
            }
            
            // Remove the pay button if it exists
            const payButton = quarterCard.querySelector('.pay-now-btn');
            if (payButton) {
                payButton.remove();
            }
        }
        
        // Update summary
        updateQuarterlySummary();
    }
}

async function getQuarterlyFeeStatus(quarter, year) {
    // Check if quarter is directly marked as paid
    if (paymentStatus.quarters && paymentStatus.quarters[quarter] === 'Paid') {
        return { status: 'Paid', statusClass: 'paid-status', textColor: 'text-green-700', showButton: false };
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
        return { status: 'Paid (Monthly)', statusClass: 'paid-status', textColor: 'text-green-700', showButton: false };
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
        return { status: 'Partially Paid', statusClass: 'partial-status', textColor: 'text-blue-700', showButton: true };
    }

    // Get current date information
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    // Determine status based on date
    if (year < currentYear || (year === currentYear && quarter <= currentQuarter)) {
        return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-700', showButton: true };
    }
    
    return { status: 'Upcoming', statusClass: 'upcoming-status', textColor: 'text-gray-600', showButton: false };
}

async function createAllQuarterlyCards(year) {
    const grid = document.getElementById('quarterlyGrid');
    if (!grid) return;
    
    // Clear the grid first
    grid.innerHTML = '';
    
    // Make sure payment status is up to date
    await fetchPaymentStatus();
    
    // Prepare all cards in a document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    // Create all quarterly cards at once
    for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterObj = quarters.find(q => q.id === quarter);
        const status = await getQuarterlyFeeStatus(quarter, year);
        
        const quarterlyCard = document.createElement('div');
        quarterlyCard.className = `quarterly-card p-4 rounded-lg border ${status.statusClass}`;
        quarterlyCard.id = `quarter-${quarter}-${year}`;
        quarterlyCard.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-semibold">Q${quarter} ${year} (${quarterObj.months.join(', ')})</h3>
                    <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                </div>
                ${status.showButton ? '<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Pay now</button>' : ''}
            </div>
        `;
        
        // Add event listener to the pay button if it exists
        if (status.showButton) {
            const payButton = quarterlyCard.querySelector('.pay-now-btn');
            payButton.addEventListener('click', () => processQuarterlyPayment(quarter, year));
        }
        
        // Add to fragment
        fragment.appendChild(quarterlyCard);
    }
    
    // Append all cards at once
    grid.appendChild(fragment);
}

// Replace updateQuarterlyGrid with the optimized function
async function updateQuarterlyGrid() {
    await createAllQuarterlyCards(currentYear);
    updateQuarterlySummary();
}


async function changeQuarterlyYear(change) {
    currentYear += change;
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
    await updateQuarterlyGrid();
    updateQuarterlySummary();
}

function processQuarterlyPayment(quarter, year) {
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { 
            name: `Fee for Q${quarter} ${year}`, 
            amount: window.quarterlyFee, 
            description: `Fee for Q${quarter} ${year}`, 
            email: window.email, 
            contact: window.phoneNumber, 
            year, 
            quarter, 
            isQuarterly: true 
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
                                isQuarterly: true 
                            },
                            success: async () => {
                                // Update local payment status
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
                                
                                // Save to local storage
                                localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                                
                                // Update quarterly card immediately
                                const quarterCard = document.getElementById(`quarter-${quarter}-${year}`);
                                if (quarterCard) {
                                    quarterCard.className = 'quarterly-card p-4 rounded-lg border paid-status';
                                    const statusSpan = quarterCard.querySelector('span');
                                    if (statusSpan) {
                                        statusSpan.className = 'text-sm font-medium text-green-700';
                                        statusSpan.textContent = 'Paid';
                                    }
                                    
                                    // Remove the pay button if it exists
                                    const payButton = quarterCard.querySelector('.pay-now-btn');
                                    if (payButton) {
                                        payButton.remove();
                                    }
                                }
                                
                                // Update both grids and summaries
                                await updateQuarterlyGrid();
                                await updateMonthsGrid();
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
            console.error('Order creation error:', err);
            alert('There was an error processing your payment. Please try again later.');
        }
    });
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
    
    // Set up event listener for pay all pending button
    const payPendingBtn = document.getElementById('payPendingQuarterlyBtn');
    if (payPendingBtn) {
        payPendingBtn.addEventListener('click', payAllPendingQuarters);
    }
    
    // Update the UI
    await updateQuarterlyGrid();
    updateQuarterlySummary();
});