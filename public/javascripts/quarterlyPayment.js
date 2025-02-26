// Use the same currentYear from the monthly code instead of redefining it

const quarterlyFee = 2400; // 3 months fee at 800 per month

// Store quarterly payment status separately
let quarterlyPaymentStatus = {};

// Define quarters with their respective months
const quarters = [
    { id: 1, name: 'Q1', months: ['January', 'February', 'March'] },
    { id: 2, name: 'Q2', months: ['April', 'May', 'June'] },
    { id: 3, name: 'Q3', months: ['July', 'August', 'September'] },
    { id: 4, name: 'Q4', months: ['October', 'November', 'December'] }
];

// We'll use the same getCurrentDate() function from the monthly code

// Fetch quarterly payment status - improved to work with the existing monthly data
async function fetchQuarterlyPaymentStatus() {
    try {
        const response = await fetch('/payment-status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Include cookies for session-based authentication
        });

        if (!response.ok) {
            throw new Error('Failed to fetch payment status');
        }

        const data = await response.json();

        if (data.success && data.paymentStatus) {
            // Convert server data to a more usable format for our client
            const formattedStatus = {};
            data.paymentStatus.forEach(item => {
                for (const [quarter, status] of item.quarters.entries()) {
                    formattedStatus[`${item.year}-Q${quarter}`] = status === 'Paid';
                }
            });

            // Update our local cache
            quarterlyPaymentStatus = formattedStatus;
            localStorage.setItem('quarterlyPaymentStatus', JSON.stringify(formattedStatus));
            return formattedStatus;
        } else {
            // If no data from server, try to use cached data
            const cachedStatus = JSON.parse(localStorage.getItem('quarterlyPaymentStatus')) || {};
            quarterlyPaymentStatus = cachedStatus;
            return cachedStatus;
        }
    } catch (error) {
        console.error('Error fetching quarterly payment status:', error);
        // Fallback to cached data if server request fails
        const cachedStatus = JSON.parse(localStorage.getItem('quarterlyPaymentStatus')) || {};
        quarterlyPaymentStatus = cachedStatus;
        return cachedStatus;
    }
}

async function getQuarterlyFeeStatus(quarter, year) {
    await fetchQuarterlyPaymentStatus(); // Ensure payment status is loaded
    
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    // Check if this quarter has been paid (from our data)
    const paymentKey = `${year}-Q${quarter}`;
    if (quarterlyPaymentStatus[paymentKey]) {
        return {
            status: 'Paid',
            statusClass: 'paid-status',
            textColor: 'text-green-700',
            showButton: false
        };
    }

    // Check if any of the months in this quarter have been paid
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 3;
    let anyMonthPaid = false;
    for (let i = startMonth; i < endMonth; i++) {
        const monthPaymentKey = `${year}-${i}`;
        if (paymentStatus[monthPaymentKey]) {
            anyMonthPaid = true;
            break;
        }
    }

    if (anyMonthPaid) {
        return {
            status: 'Paid (Monthly)',
            statusClass: 'paid-status',
            textColor: 'text-green-700',
            showButton: false
        };
    }

    // Handle previous years - all should be paid
    if (year < currentYear) {
        return {
            status: 'Paid',
            statusClass: 'paid-status',
            textColor: 'text-green-700',
            showButton: false
        };
    }

    // Current year logic
    if (year === currentYear) {
        // Current quarter
        if (quarter === currentQuarter) {
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
            };
        }
        // Past quarters in current year
        else if (quarter < currentQuarter) {
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
            };
        }
        // Future quarters in current year
        else {
            return {
                status: 'Upcoming',
                statusClass: 'upcoming-status',
                textColor: 'text-gray-600',
                showButton: false
            };
        }
    }

    // Future years
    return {
        status: 'Upcoming',
        statusClass: 'upcoming-status',
        textColor: 'text-gray-600',
        showButton: false
    };
}

async function createQuarterlyCard(quarter, year) {
    const quarterObj = quarters.find(q => q.id === quarter);
    const status = await getQuarterlyFeeStatus(quarter, year);

    const quarterlyCard = document.createElement('div');
    quarterlyCard.className = `quarterly-card p-4 rounded-lg border ${status.statusClass}`;
    quarterlyCard.id = `quarter-${quarter}-${year}`;

    const buttonHtml = status.showButton ?
        `<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Pay now
        </button>` : '';

    // Create HTML for included months
    const monthsList = quarterObj.months.join(', ');

    quarterlyCard.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h3 class="font-semibold">Q${quarter} ${year} (${monthsList})</h3>
                <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
            </div>
            ${buttonHtml}
        </div>
    `;

    if (status.showButton) {
        const payButton = quarterlyCard.querySelector('.pay-now-btn');
        payButton.addEventListener('click', () => processQuarterlyPayment(quarter, year));
    }

    return quarterlyCard;
}

async function updateQuarterlyGrid() {
    const grid = document.getElementById('quarterlyGrid');
    if (!grid) return; // Safety check
    
    grid.innerHTML = '';

    // Show all 4 quarters for the current year
    for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterlyCard = await createQuarterlyCard(quarter, currentYear);
        grid.appendChild(quarterlyCard);
    }
}

function calculatePendingQuarterlyAmount() {
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    let pendingQuarters = 0;

    // If current year matches the displayed year
    if (currentYear === currentYear) {
        // Count pending quarters from Q1 to current quarter
        for (let quarter = 1; quarter <= currentQuarter; quarter++) {
            const paymentKey = `${currentYear}-Q${quarter}`;
            if (!quarterlyPaymentStatus[paymentKey]) {
                pendingQuarters++;
            }
        }
    }
    // If displayed year is in the past, all quarters should be paid
    else if (currentYear < currentYear) {
        pendingQuarters = 0;
    }
    // If displayed year is in the future, count based on policy
    else {
        pendingQuarters = 0; // No payment required for future year
    }

    return pendingQuarters * quarterlyFee;
}

function calculatePaidQuarterlyAmount() {
    const currentDate = getCurrentDate();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

    let paidQuarters = 0;

    // Count actually paid quarters for current year
    if (currentYear === currentDate.getFullYear()) {
        for (let quarter = 1; quarter <= 4; quarter++) {
            const paymentKey = `${currentYear}-Q${quarter}`;
            if (quarterlyPaymentStatus[paymentKey]) {
                paidQuarters++;
            }
        }
    }
    // For past years, all 4 quarters should show as paid
    else if (currentYear < currentDate.getFullYear()) {
        paidQuarters = 4;
    }

    return paidQuarters * quarterlyFee;
}

function updateQuarterlySummary() {
    const totalPaid = calculatePaidQuarterlyAmount();
    const pendingAmount = calculatePendingQuarterlyAmount();

    const totalPaidElement = document.getElementById('totalPaidQuarterly');
    const pendingAmountElement = document.getElementById('pendingAmountQuarterly');
    
    if (totalPaidElement) totalPaidElement.textContent = `₹${totalPaid}`;
    if (pendingAmountElement) pendingAmountElement.textContent = `₹${pendingAmount}`;

    // Disable pay button if nothing is pending
    const payButton = document.getElementById('payPendingQuarterlyBtn');
    if (payButton) {
        if (pendingAmount <= 0) {
            payButton.disabled = true;
            payButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            payButton.disabled = false;
            payButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function changeQuarterlyYear(change) {
    currentYear += change;
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
    await updateQuarterlyGrid();
    updateQuarterlySummary();
}

function processQuarterlyPayment(quarter, year) {
    const quarterObj = quarters.find(q => q.id === quarter);
    const monthsList = quarterObj.months.join(', ');

    $.ajax({
        url: "/createOrder",
        type: "POST",
        data: {
            name: `Fee for Q${quarter} ${year}`,
            amount: quarterlyFee,
            description: `Quarterly fee payment for Q${quarter} (${monthsList}) ${year}`,
            email: 'amogha.khare@example.com',
            contact: '9876543210',
            year: year,
            quarter: quarter, // Add quarter info for backend
            isQuarterly: true // Flag to identify quarterly payments
        },
        success: function(res) {
            if (res.success) {
                var options = {
                    "key": res.key_id,
                    "amount": res.amount,
                    "currency": "INR",
                    "order_id": res.order_id,
                    "handler": function (response) {
                        // Update quarterly payment status
                        const paymentKey = `${year}-Q${quarter}`;
                        quarterlyPaymentStatus[paymentKey] = true;
                        localStorage.setItem('quarterlyPaymentStatus', JSON.stringify(quarterlyPaymentStatus));

                        // Call the backend to update the payment status in the database
                        $.ajax({
                            url: "/update-payment-quarter",
                            type: "POST",
                            data: {
                                userId: window.userId, // Pass the userId from your session or state
                                year: year,
                                quarter: quarter
                            },
                            success: function(res) {
                                if (res.success) {
                                    // Update UI
                                    updateQuarterlyGrid();
                                    updateQuarterlySummary();
                                    alert(`Payment Successful for Q${quarter} ${year}`);
                                } else {
                                    alert('Failed to update payment status');
                                }
                            },
                            error: function(err) {
                                console.error('Error updating payment status:', err);
                                alert("Something went wrong. Please try again.");
                            }
                        });
                    },
                    "prefill": {
                        "contact": res.contact,
                        "name": res.name,
                        "email": res.email
                    },
                    "theme": {
                        "color": "#6B46C1"
                    }
                };
                var razorpayObject = new Razorpay(options);
                razorpayObject.on('payment.failed', function(response) {
                    alert(`Payment Failed for Q${quarter} ${year}`);
                });
                razorpayObject.open();
            } else {
                alert(res.msg);
            }
        },
        error: function(err) {
            console.error('Error creating order:', err);
            alert("Something went wrong. Please try again.");
        }
    });
}



// Initialize quarterly payment view
function initQuarterlyPayments() {
    // Set current year in UI
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
    
    // Set up event listeners for year navigation
    const prevYearBtn = document.getElementById('prevYearQuarterly');
    const nextYearBtn = document.getElementById('nextYearQuarterly');
   
    
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeQuarterlyYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeQuarterlyYear(1));
   
    
    // Update the UI
    updateQuarterlyGrid();
    updateQuarterlySummary();
}