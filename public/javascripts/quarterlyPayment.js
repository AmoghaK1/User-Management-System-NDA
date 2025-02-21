// const quarterlyFee = 2400; // 3 months fee at 800 per month
async function fetchExamFee() {
    try {
        const response = await fetch('/getUserFee');
        const data = await response.json();
        return data.exam_fee || 800;
    } catch (error) {
        console.error("Error fetching exam fee:", error);
        return 800;
    }
}

async function calculatePendingQuarterlyAmount() {
    const examFee = await fetchExamFee();
    const quarterlyFee = examFee * 3; // Update quarterly fee dynamically
    let pendingQuarters = 0;
    for (let quarter = 1; quarter <= Math.floor(new Date().getMonth() / 3) + 1; quarter++) {
        if (!quarterlyPaymentStatus[`${currentYear}-Q${quarter}`]) {
            pendingQuarters++;
        }
    }
    return pendingQuarters * quarterlyFee;
}


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
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

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
        if (currentQuarter === quarter) {
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
            };
        }
        // Past quarters in current year
        else if (currentQuarter > quarter) {
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
    const quarterObj = quarters.find(q => q.id === quarter)
    const status = getQuarterlyFeeStatus(quarter, year);

    const quarterlyCard = document.createElement('div');
    quarterlyCard.className = `quarterly-card p-4 rounded-lg border ${status.statusClass}`;
    quarterlyCard.id = `quarter-${quarter}-${year}`;

    const buttonHtml = status.showButton ?
        `<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Pay now
        </button>` : '';

    // Create HTML for included months - similar to monthly card layout
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

function updateQuarterlyGrid() {
    const grid = document.getElementById('quarterlyGrid');
    if (!grid) return; // Safety check
    
    grid.innerHTML = '';

    // Show all 4 quarters for the current year
    for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterlyCard = createQuarterlyCard(quarter, currentYear);
        grid.appendChild(quarterlyCard);
    }
}

async function calculatePendingQuarterlyAmount() {
    const examFee = await fetchExamFee();
    const quarterlyFee = examFee * 3;

    let pendingQuarters = 0;

    // If current year matches the displayed year
    if (currentYear === currentYear) {
        // Count pending quarters from Q1 to current quarter
        if (!quarterlyPaymentStatus[`${currentYear}-Q${quarter}`]) {
            pendingQuarters++;
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

async function calculatePaidQuarterlyAmount() {
    const examFee = await fetchExamFee();
    const quarterlyFee = examFee * 3; // Calculate quarterly fee dynamically
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

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

function changeQuarterlyYear(change) {
    currentYear += change;
    const yearElement = document.getElementById('currentYearQuarterly');
    if (yearElement) yearElement.textContent = currentYear;
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
    // Set up year navigation
    const prevYearBtn = document.getElementById('prevYearQuarterly');
    const nextYearBtn = document.getElementById('nextYearQuarterly');
    const payPendingBtn = document.getElementById('payPendingQuarterlyBtn');
    
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeQuarterlyYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeQuarterlyYear(1));
    if (payPendingBtn) payPendingBtn.addEventListener('click', processAllPendingQuarterlyPayment);
    
    // The main initialization now happens in accounts2.js
});
