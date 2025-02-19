const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentYear = new Date().getFullYear();
const monthlyFee = 800;

// Store payment status in local storage to persist between page loads
const paymentStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};

function getCurrentDate() {
    return new Date();
}

function getFeeStatus(month, year) {
    const monthIndex = months.indexOf(month);
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Check if this month has been paid (from local storage)
    const paymentKey = `${year}-${monthIndex}`;
    if (paymentStatus[paymentKey]) {
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
        // Current month
        if (monthIndex === currentMonth) {
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
            };
        }
        // Past months in current year
        else if (monthIndex < currentMonth) {
            // This is where we check if January is paid for current year
            if (monthIndex === 0 && !paymentStatus[`${year}-0`]) {
                return {
                    status: 'Pending',
                    statusClass: 'pending-status',
                    textColor: 'text-orange-700',
                    showButton: true
                };
            }
            return {
                status: 'Paid',
                statusClass: 'paid-status',
                textColor: 'text-green-700',
                showButton: false
            };
        }
        // Future months in current year
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

function createMonthCard(month, year) {
    const status = getFeeStatus(month, year);
    
    const monthCard = document.createElement('div');
    monthCard.className = `month-card p-4 rounded-lg border ${status.statusClass}`;
    monthCard.id = `month-${month.toLowerCase()}-${year}`;

    const buttonHtml = status.showButton ? 
        `<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Pay now
        </button>` : '';

    monthCard.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h3 class="font-semibold">${month} ${year}</h3>
                <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
            </div>
            ${buttonHtml}
        </div>
    `;

    if (status.showButton) {
        const payButton = monthCard.querySelector('.pay-now-btn');
        payButton.addEventListener('click', () => processPayment(month, year));
    }
    
    return monthCard;
}

function updateMonthsGrid() {
    const grid = document.getElementById('monthsGrid');
    grid.innerHTML = '';

    // Show all 12 months for the current year
    months.forEach(month => {
        const monthCard = createMonthCard(month, currentYear);
        grid.appendChild(monthCard);
    });
}

function calculatePendingAmount() {
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let pendingMonths = 0;
    
    // If current year matches the displayed year
    if (currentYear === currentYear) {
        // Count pending months from January to current month
        for (let i = 0; i <= currentMonth; i++) {
            const paymentKey = `${currentYear}-${i}`;
            if (!paymentStatus[paymentKey]) {
                pendingMonths++;
            }
        }
    } 
    // If displayed year is in the past, all months should be paid
    else if (currentYear < currentYear) {
        pendingMonths = 0;
    } 
    // If displayed year is in the future, all months are pending
    else {
        pendingMonths = 12;
    }
    
    return pendingMonths * monthlyFee;
}

function calculatePaidAmount() {
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    
    let paidMonths = 0;
    
    // Count actually paid months for current year
    if (currentYear === currentDate.getFullYear()) {
        for (let i = 0; i <= currentMonth; i++) {
            const paymentKey = `${currentYear}-${i}`;
            if (paymentStatus[paymentKey]) {
                paidMonths++;
            }
        }
    } 
    // For past years, all 12 months should show as paid
    else if (currentYear < currentDate.getFullYear()) {
        paidMonths = 12;
    }
    
    return paidMonths * monthlyFee;
}

function updateYearSummary() {
    const totalPaid = calculatePaidAmount();
    const pendingAmount = calculatePendingAmount();

    document.getElementById('totalPaid').textContent = `₹${totalPaid}`;
    document.getElementById('pendingAmount').textContent = `₹${pendingAmount}`;
    
    // Disable pay button if nothing is pending
    const payButton = document.getElementById('payPendingBtn');
    if (pendingAmount <= 0) {
        payButton.disabled = true;
        payButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        payButton.disabled = false;
        payButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function changeYear(change) {
    currentYear += change;
    document.getElementById('currentYear').textContent = currentYear;
    updateMonthsGrid();
    updateYearSummary();
}

function processPayment(month, year) {
    const monthIndex = months.indexOf(month);
    const paymentKey = `${year}-${monthIndex}`;
    
    $.ajax({
        url: "/createOrder",
        type: "POST",
        data: {
            name: `Fee for ${month} ${year}`,
            amount: monthlyFee,
            description: `Monthly fee payment for ${month} ${year}`,
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
                        paymentStatus[paymentKey] = true;
                        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                        
                        // Update the UI
                        updateMonthsGrid();
                        updateYearSummary();
                        
                        alert(`Payment Successful for ${month} ${year}`);
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
                    alert(`Payment Failed for ${month} ${year}`);
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

function processAllPendingPayment() {
    const pendingAmount = calculatePendingAmount();
    
    if (pendingAmount <= 0) {
        alert("No pending payments to process");
        return;
    }
    
    $.ajax({
        url: "/createOrder",
        type: "POST",
        data: {
            name: "Pending Fee Payment",
            amount: pendingAmount,
            description: `Pending fee payment for ${currentYear}`,
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
                        // Mark all pending months as paid
                        const currentDate = getCurrentDate();
                        const currentMonth = currentDate.getMonth();
                        
                        // If current year, mark all months until current month as paid
                        if (currentYear === currentDate.getFullYear()) {
                            for (let i = 0; i <= currentMonth; i++) {
                                const paymentKey = `${currentYear}-${i}`;
                                paymentStatus[paymentKey] = true;
                            }
                        }
                        // For past years, mark all months as paid
                        else if (currentYear < currentDate.getFullYear()) {
                            for (let i = 0; i < 12; i++) {
                                const paymentKey = `${currentYear}-${i}`;
                                paymentStatus[paymentKey] = true;
                            }
                        }
                        
                        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                        
                        // Update the UI
                        updateMonthsGrid();
                        updateYearSummary();
                        
                        alert("All pending payments processed successfully");
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
    document.getElementById('currentYear').textContent = currentYear;
    
    // Initialize grid and summary
    updateMonthsGrid();
    updateYearSummary();

    // Set up year navigation
    document.getElementById('prevYear').addEventListener('click', () => changeYear(-1));
    document.getElementById('nextYear').addEventListener('click', () => changeYear(1));
    
    // Set up the pending payment button
    document.getElementById('payPendingBtn').addEventListener('click', processAllPendingPayment);
});