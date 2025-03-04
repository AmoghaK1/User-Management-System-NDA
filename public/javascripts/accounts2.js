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
        paymentStatus = data.success ? data.paymentStatus : JSON.parse(localStorage.getItem('paymentStatus')) || {};
        localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
        return paymentStatus;
    } catch (error) {
        console.error('Fetch error:', error);
        paymentStatus = JSON.parse(localStorage.getItem('paymentStatus')) || {};
        return paymentStatus;
    }
}

async function getFeeStatus(month, year) {
    await fetchPaymentStatus();
    const monthIndex = months.indexOf(month);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const paymentKey = `${year}-${monthIndex}`;
    if (paymentStatus.months?.[monthIndex] === 'Paid') {
        return { status: 'Paid', statusClass: 'paid-status', textColor: 'text-green-700', showButton: false };
    }

    const quarter = Math.floor(monthIndex / 3) + 1;
    if (paymentStatus.quarters?.[quarter] === 'Paid') {
        return { status: 'Paid (Quarterly)', statusClass: 'paid-status', textColor: 'text-green-700', showButton: false };
    }

    if (year < currentYear || (year === currentYear && monthIndex < currentMonth)) {
        return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-700', showButton: true };
    }
    if (year === currentYear && monthIndex === currentMonth) {
        return { status: 'Pending', statusClass: 'pending-status', textColor: 'text-orange-700', showButton: true };
    }
    return { status: 'Upcoming', statusClass: 'upcoming-status', textColor: 'text-gray-600', showButton: false };
}

async function createMonthCard(month, year) {
    const status = await getFeeStatus(month, year);
    const monthCard = document.createElement('div');
    monthCard.className = `month-card p-4 rounded-lg border ${status.statusClass}`;
    monthCard.id = `month-${month.toLowerCase()}-${year}`;
    monthCard.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h3 class="font-semibold">${month} ${year}</h3>
                <span class="text-sm font-medium ${status.textColor}">${status.status}</span>
            </div>
            ${status.showButton ? '<button class="pay-now-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Pay now</button>' : ''}
        </div>
    `;
    if (status.showButton) {
        monthCard.querySelector('.pay-now-btn').addEventListener('click', () => processPayment(month, year));
    }
    return monthCard;
}
async function updateMonthsGrid() {
    const grid = document.getElementById('monthsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const month of months) {
        grid.appendChild(await createMonthCard(month, currentYear));
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchPaymentStatus();
    document.getElementById('currentYear').textContent = currentYear;
    document.getElementById('prevYear')?.addEventListener('click', () => changeYear(-1));
    document.getElementById('nextYear')?.addEventListener('click', () => changeYear(1));
    await updateMonthsGrid();
});


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
    $.ajax({
        url: '/createOrder',
        type: 'POST',
        data: { name: `Fee for ${month} ${year}`, amount: window.monthlyFee, description: `Fee for ${month} ${year}`, email: 'amogha.khare@example.com', contact: '9876543210', year, month: monthIndex, isQuarterly: false },
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
                            data: { userId: window.userId, year, month: monthIndex, isQuarterly: false },
                            success: async () => {
                                paymentStatus.months[monthIndex] = 'Paid';
                                localStorage.setItem('paymentStatus', JSON.stringify(paymentStatus));
                                await updateMonthsGrid();
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
    })
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