const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let currentYear = new Date().getFullYear();


// Store payment status in local storage as a backup
let paymentStatus = {};

function getCurrentDate() {
    return new Date();
}

// Fetch payment status from the server
async function fetchPaymentStatus() {
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
                for (const [month, status] of item.months.entries()) {
                    formattedStatus[`${item.year}-${month}`] = status === 'Paid';
                }
            });

            // Update our local cache
            paymentStatus = formattedStatus;
            localStorage.setItem('paymentStatus', JSON.stringify(formattedStatus));
            return formattedStatus;
        } else {
            // If no data from server, try to use cached data
            const cachedStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};
            paymentStatus = cachedStatus;
            return cachedStatus;
        }
    } catch (error) {
        console.error('Error fetching payment status:', error);
        // Fallback to cached data if server request fails
        const cachedStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};
        paymentStatus = cachedStatus;
        return cachedStatus;
    }
}

async function getFeeStatus(month, year) {
    await fetchPaymentStatus(); // Ensure payment status is loaded
    
    const monthIndex = months.indexOf(month);
    const currentDate = getCurrentDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Check if this month has been paid (from our data)
    const paymentKey = `${year}-${monthIndex}`;
    if (paymentStatus[paymentKey]) {
        return {
            status: 'Paid',
            statusClass: 'paid-status',
            textColor: 'text-green-700',
            showButton: false
        };
    }

    // Check if the corresponding quarter has been paid
    const quarter = Math.floor(monthIndex / 3) + 1; // Calculate the quarter for the month
    const quarterPaymentKey = `${year}-Q${quarter}`;
    if (quarterlyPaymentStatus[quarterPaymentKey]) {
        return {
            status: 'Paid (Quarterly)',
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
            return {
                status: 'Pending',
                statusClass: 'pending-status',
                textColor: 'text-orange-700',
                showButton: true
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

async function createMonthCard(month, year) {
    const status = await getFeeStatus(month, year);
    
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

async function updateMonthsGrid() {
    const grid = document.getElementById('monthsGrid');
    if (!grid) return; // Safety check
    
    grid.innerHTML = '';

    // Show all 12 months for the current year
    for (const month of months) {
        const monthCard = await createMonthCard(month, currentYear);
        grid.appendChild(monthCard);
    }
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

    const totalPaidElement = document.getElementById('totalPaid');
    const pendingAmountElement = document.getElementById('pendingAmount');
    
    if (totalPaidElement) totalPaidElement.textContent = `₹${totalPaid}`;
    if (pendingAmountElement) pendingAmountElement.textContent = `₹${pendingAmount}`;
    
    // Disable pay button if nothing is pending
    const payButton = document.getElementById('payPendingBtn');
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

async function changeYear(change) {
    currentYear += change;
    const yearElement = document.getElementById('currentYear');
    if (yearElement) yearElement.textContent = currentYear;
    await updateMonthsGrid();
    updateYearSummary();
}

function processPayment(month, year) {
    const monthIndex = months.indexOf(month);

    // Check if the corresponding quarter has been paid
    const quarter = Math.floor(monthIndex / 3) + 1;
    const quarterPaymentKey = `${year}-Q${quarter}`;
    if (quarterlyPaymentStatus[quarterPaymentKey]) {
        alert('Cannot pay for this month as the corresponding quarter has already been paid.');
        return;
    }

    $.ajax({
        url: "/createOrder",
        type: "POST",
        data: {
            name: `Fee for ${month} ${year}`,
            amount: window.monthlyFee,
            description: `Monthly fee payment for ${month} ${year}`,
            email: 'amogha.khare@example.com',
            contact: '9876543210',
            year: year,
            month: monthIndex,
            isQuarterly: false
        },
        success: function(res) {
            if (res.success) {
                var options = {
                    "key": res.key_id,
                    "amount": res.amount,
                    "currency": "INR",
                    "order_id": res.order_id,
                    "handler": function (response) {
                        // Update local payment status
                        const paymentKey = `${year}-${monthIndex}`;
                        paymentStatus[paymentKey] = true;
                        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));

                        // Call the backend to update the payment status in the database
                        $.ajax({
                            url: "/update-payment-month",
                            type: "POST",
                            data: {
                                userId: window.userId, // Pass the userId from your session or state
                                year: year,
                                month: monthIndex
                            },
                            success: function(res) {
                                if (res.success) {
                                    // Update UI
                                    updateMonthsGrid();
                                    updateYearSummary();
                                    alert(`Payment Successful for ${month} ${year}`);
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

// Payment method selection function after initial selection
function setPaymentMethod(method) {
    const monthlySection = document.getElementById('monthlySection');
    const quarterlySection = document.getElementById('quarterlySection');
    const monthlyBtn = document.getElementById('monthlyPaymentBtn');
    const quarterlyBtn = document.getElementById('quarterlyPaymentBtn');
    
    if (method === 'monthly') {
        // Update button styles
        monthlyBtn.classList.add('bg-purple-800');
        quarterlyBtn.classList.remove('bg-purple-800');
        
        // Show monthly section
        monthlySection.style.display = 'block';
        quarterlySection.style.display = 'none';
        
        // Update monthly UI
        updateMonthsGrid();
        updateYearSummary();
        
        // Save preference
        localStorage.setItem('paymentMethod', 'monthly');
    } else {
        // Update button styles
        quarterlyBtn.classList.add('bg-purple-800');
        monthlyBtn.classList.remove('bg-purple-800');
        
        // Show quarterly section
        monthlySection.style.display = 'none';
        quarterlySection.style.display = 'block';
        
        // Update quarterly UI (from quarterlyPayment.js)
        updateQuarterlyGrid();
        updateQuarterlySummary();
        
        // Save preference
        localStorage.setItem('paymentMethod', 'quarterly');
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Initial fetch of payment status
    await fetchPaymentStatus();
    
    // Set current year from actual date
    currentYear = getCurrentDate().getFullYear();
    
    // Set up year navigation for monthly view
    const prevYearBtn = document.getElementById('prevYear');
    const nextYearBtn = document.getElementById('nextYear');
   const yearElement = document.getElementById('currentYear');
    
    if (yearElement) yearElement.textContent = currentYear;
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => changeYear(-1));
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => changeYear(1));
    
    
    // Get payment method selection buttons (once user has already made an initial choice)
    const monthlyPaymentBtn = document.getElementById('monthlyPaymentBtn');
    const quarterlyPaymentBtn = document.getElementById('quarterlyPaymentBtn');
    
    // Add event listeners for payment method buttons (secondary navigation)
    if (monthlyPaymentBtn) {
        monthlyPaymentBtn.addEventListener('click', () => setPaymentMethod('monthly'));
    }
    
    if (quarterlyPaymentBtn) {
        quarterlyPaymentBtn.addEventListener('click', () => setPaymentMethod('quarterly'));
    }
    
    // Initialize UI
    await updateMonthsGrid();
    updateYearSummary();
});