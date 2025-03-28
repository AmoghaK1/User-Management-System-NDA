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
        const response = await fetch('/payment-status', { credentials: 'include' });
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.success) {
            paymentStatus = data.paymentStatus;
        } else {
            paymentStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};
        }
        
        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
        return paymentStatus;
    } catch (error) {
        console.error('Fetch error:', error);
        paymentStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};
        return paymentStatus;
    }
}

// Optimized function to create all month cards at once
async function createAllMonthCards(year) {
    const grid = document.getElementById('monthsGrid');
    if (!grid) return;

    // Clear the grid first
    grid.innerHTML = '';

    // Get payment status once for all months
    await fetchPaymentStatus();

    // Prepare all cards in a document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    // Get current date information
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Create all month cards at once
    for (let i = 0; i < months.length; i++) {
        const month = months[i];

        // Determine status
        let status = { 
            status: 'Upcoming', 
            statusClass: 'upcoming-status', 
            textColor: 'text-gray-600', 
            showButton: false 
        };

        // Check if month is paid in payment status
        if (year < currentYear || (paymentStatus.months && paymentStatus.months[i] === 'Paid')) {
            status = { 
                status: 'Paid', 
                statusClass: 'paid-status', 
                textColor: 'text-green-800', 
                showButton: false 
            };
        } else {
            // Check if quarter is paid
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

        // Create the month card
        const monthCard = document.createElement('div');
        monthCard.className = `month-card p-4 rounded-lg border ${status.statusClass}`;
        monthCard.id = `month-${month.toLowerCase()}-${year}`;
        monthCard.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="font-semibold">${month} ${year}</h3>
                    <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
                </div>
                ${status.showButton ? `<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600" data-month="${i}" data-year="${year}">Pay now</button>` : ''}
            </div>
        `;

        // Add to fragment
        fragment.appendChild(monthCard);
    }

    // Append all cards at once
    grid.appendChild(fragment);
}

// ✅ Event Delegation: Add event listener ONCE to the parent container
document.getElementById('monthsGrid').addEventListener('click', (event) => {
    if (event.target.classList.contains('pay-now-btn')) {
        // Get month and year from data attributes
        const monthIndex = event.target.getAttribute('data-month');
        const year = event.target.getAttribute('data-year');

        if (monthIndex !== null && year !== null) {
            processPayment(months[monthIndex], parseInt(year));
        }
    }
});

// ✅ Update months grid function
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

function processPayment(month, year) {
    const monthIndex = months.indexOf(month);
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { 
            name: `Fee for ${month} ${year}`, 
            amount: window.monthlyFee, 
            description: `Fee for ${month} ${year}`, 
            email: window.email, 
            contact: window.phoneNumber, 
            year, 
            month: monthIndex, 
            isQuarterly: false 
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
                                updateQuarterlyAfterMonthlyPayment(monthIndex);
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
        error: (err) => console.error(err)
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