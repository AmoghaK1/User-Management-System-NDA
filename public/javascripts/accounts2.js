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