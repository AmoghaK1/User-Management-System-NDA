const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentYear = new Date().getFullYear();
const quarterlyFee = 2400; // 3 months fee

// Store payment status in local storage to persist between page loads
const quarterlyPaymentStatus = JSON.parse(localStorage.getItem('quarterlyPaymentStatus')) || {};

// Define quarters with their respective months
const quarters = [
    { id: 1, name: 'Q1', months: ['January', 'February', 'March'] },
    { id: 2, name: 'Q2', months: ['April', 'May', 'June'] },
    { id: 3, name: 'Q3', months: ['July', 'August', 'September'] },
    { id: 4, name: 'Q4', months: ['October', 'November', 'December'] }
];

function getCurrentDate() {
    return new Date();
}

function getQuarterlyFeeStatus(quarter, year) {
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const quarterStartMonth = (quarter - 1) * 3;

    // Check if this quarter has been paid (from local storage)
    const paymentKey = `${year}-Q${quarter}`;
    if (quarterlyPaymentStatus[paymentKey]) {
        return {
            status: 'Paid',
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
        if (Math.floor(currentMonth / 3) + 1 === quarter) {
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
            };
        }
        // Past quarters in current year
        else if (Math.floor(currentMonth / 3) + 1 > quarter) {
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

function createQuarterlyCard(quarter, year) {
    const quarterObj = quarters.find(q => q.id === quarter);
    const status = getQuarterlyFeeStatus(quarter, year);

    const quarterlyCard = document.createElement('div');
    quarterlyCard.className = `quarterly-card p-4 rounded-lg border ${status.statusClass}`;
    quarterlyCard.id = `quarter-${quarter}-${year}`;

    const buttonHtml = status.showButton ?
        `<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Pay now
        </button>` : '';

    // Create HTML for included months
    const monthsHtml = quarterObj.months.map(month => 
        `<span class="inline-block text-xs bg-gray-100 rounded px-2 py-1 mr-1 mb-1">${month}</span>`
    ).join('');

    quarterlyCard.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="font-semibold">Q${quarter} ${year}</h3>
                <span class="text-sm font-medium ${status.textColor} mb-2 block">${status.status}</span>
                <div class="mt-2 flex flex-wrap">
                    ${monthsHtml}
                </div>
            </div>
            <div>
                <span class="block text-sm font-semibold mb-2">₹${quarterlyFee}</span>
                ${buttonHtml}
            </div>
        </div>
    `;

    if (status.showButton) {
        const payButton = quarterlyCard.querySelector('.pay-now-btn');
        payButton.addEventListener('click', () => processQuarterlyPayment(quarter, year));
    }

    return quarterlyCard;
}

function updateQuarterlyGrid() {
    const grid = document.getElementById('quarterlyGrid');
    grid.innerHTML = '';

    // Show all 4 quarters for the current year
    for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterlyCard = createQuarterlyCard(quarter, currentYear);
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
    const currentMonth = currentDate.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    let paidQuarters = 0;

    // Count actually paid quarters for current year
    if (currentYear === currentDate.getFullYear()) {
        for (let quarter = 1; quarter <= currentQuarter; quarter++) {
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

    document.getElementById('totalPaidQuarterly').textContent = `₹${totalPaid}`;
    document.getElementById('pendingAmountQuarterly').textContent = `₹${pendingAmount}`;

    // Disable pay button if nothing is pending
    const payButton = document.getElementById('payPendingQuarterlyBtn');
    if (pendingAmount <= 0) {
        payButton.disabled = true;
        payButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        payButton.disabled = false;
        payButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function changeQuarterlyYear(change) {
    currentYear += change;
    document.getElementById('currentYearQuarterly').textContent = currentYear;
    updateQuarterlyGrid();
    updateQuarterlySummary();
}

function processQuarterlyPayment(quarter, year) {
    const paymentKey = `${year}-Q${quarter}`;
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
            contact: '9876543210'
        },
        success: function(res) {
            if (res.success) {
                var options = {
                    "key": res.key_id,
                    "amount": res.amount,
                    "currency": "INR",
                    "order_id": res.order_id,
                    "handler": function (response) {
                        // Update payment status in local storage
                        quarterlyPaymentStatus[paymentKey] = true;
                        localStorage.setItem('quarterlyPaymentStatus', JSON.stringify(quarterlyPaymentStatus));

                        // Update the UI
                        updateQuarterlyGrid();
                        updateQuarterlySummary();

                        alert(`Payment Successful for Q${quarter} ${year}`);
                    },
                    "prefill": {
                        "contact": res.contact,
                        "name": "Amogha Khare",
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

function processAllPendingQuarterlyPayment() {
    const pendingAmount = calculatePendingQuarterlyAmount();

    if (pendingAmount <= 0) {
        alert("No pending payments to process");
        return;
    }

    $.ajax({
        url: "/createOrder",
        type: "POST",
        data: {
            name: "Pending Quarterly Fee Payment",
            amount: pendingAmount,
            description: `Pending quarterly fee payment for ${currentYear}`,
            email: 'amogha.khare@example.com',
            contact: '9876543210'
        },
        success: function(res) {
            if (res.success) {
                var options = {
                    "key": res.key_id,
                    "amount": res.amount,
                    "currency": "INR",
                    "order_id": res.order_id,
                    "handler": function (response) {
                        // Mark all pending quarters as paid
                        const currentDate = getCurrentDate();
                        const currentMonth = currentDate.getMonth();
                        const currentQuarter = Math.floor(currentMonth / 3) + 1;

                        // If current year, mark all quarters until current quarter as paid
                        if (currentYear === currentDate.getFullYear()) {
                            for (let quarter = 1; quarter <= currentQuarter; quarter++) {
                                const paymentKey = `${currentYear}-Q${quarter}`;
                                quarterlyPaymentStatus[paymentKey] = true;
                            }
                        }
                        // For past years, mark all quarters as paid
                        else if (currentYear < currentDate.getFullYear()) {
                            for (let quarter = 1; quarter <= 4; quarter++) {
                                const paymentKey = `${currentYear}-Q${quarter}`;
                                quarterlyPaymentStatus[paymentKey] = true;
                            }
                        }

                        localStorage.setItem('quarterlyPaymentStatus', JSON.stringify(quarterlyPaymentStatus));

                        // Update the UI
                        updateQuarterlyGrid();
                        updateQuarterlySummary();

                        alert("All pending quarterly payments processed successfully");
                    },
                    "prefill": {
                        "contact": res.contact,
                        "name": "Amogha Khare",
                        "email": res.email
                    },
                    "theme": {
                        "color": "#6B46C1"
                    }
                };
                var razorpayObject = new Razorpay(options);
                razorpayObject.on('payment.failed', function(response) {
                    alert("Payment Failed");
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

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set current year from actual date
    currentYear = getCurrentDate().getFullYear();
    document.getElementById('currentYearQuarterly').textContent = currentYear;

    // Initialize grid and summary
    updateQuarterlyGrid();
    updateQuarterlySummary();

    // Set up year navigation
    document.getElementById('prevYearQuarterly').addEventListener('click', () => changeQuarterlyYear(-1));
    document.getElementById('nextYearQuarterly').addEventListener('click', () => changeQuarterlyYear(1));

    // Set up the pending payment button
    document.getElementById('payPendingQuarterlyBtn').addEventListener('click', processAllPendingQuarterlyPayment);
});