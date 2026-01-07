// feeCollection.js
let paymentDetailsTable;
let paymentDetailsYear = new Date().getFullYear();

// In feeCollection.js
async function fetchPaymentDetails(year) {
    try {
        const params = new URLSearchParams();
        if (year) {
            params.set('year', year);
        }
        const query = params.toString();
        const response = await fetch(`/student-payment-details${query ? `?${query}` : ''}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        console.log('Raw payment details received:', data); // Debug log
        if (data.success) {
            console.log('Formatted payments:', data.payments); // Debug log
            return {
                payments: data.payments,
                year: data.year,
                availableYears: data.availableYears || []
            };
        } else {
            console.error('Failed to fetch payment details');
            return { payments: [], year, availableYears: [] };
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return { payments: [], year, availableYears: [] };
    }
}

function initializeDataTable(data) {
    if (!document.getElementById('paymentDetailsTable')) {
        return;
    }
    console.log('Initializing DataTable with data:', data); // Debug log
    
    if (paymentDetailsTable) {
        paymentDetailsTable.destroy();
    }
    
    paymentDetailsTable = $('#paymentDetailsTable').DataTable({
        data: data,
        columns: [
            { data: 'studentName', title: 'Student Name' },
            { data: 'studentEmail', title: 'Email' },
            { data: 'paymentType', title: 'Payment Type' },
            { data: 'period', title: 'Period' },
            { data: 'year', title: 'Year' },
            { 
                data: 'status', 
                title: 'Status',
                render: function(data) {
                    const badgeClass = data === 'Paid' ? 'bg-success' : 'bg-danger';
                    return `<span class="badge ${badgeClass} text-white">${data}</span>`;
                }
            }
        ],
        order: [[4, 'desc'], [3, 'desc']],
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'copy', 
            'csv', 
            'excel', 
            'pdf', 
            'print',
            {
                text: 'Paid Only',
                action: function () {
                    paymentDetailsTable
                        .column(5)  // Status column
                        .search('^Paid$', true, false)  // Use regex for exact match
                        .draw();
                }
            },
            {
                text: 'Pending Only',
                action: function () {
                    paymentDetailsTable
                        .column(5)  // Status column
                        .search('^Pending$', true, false)  // Use regex for exact match
                        .draw();
                }
            },
            {
                text: 'Show All',
                action: function () {
                    paymentDetailsTable
                        .column(5)  // Status column
                        .search('')
                        .draw();
                }
            }
        ]
    });
}

function openFeeCollectionModal() {
    const modal = document.getElementById('feeCollectionModal');
    const hasStudentTable = document.getElementById('paymentDetailsTable');
    if (modal && hasStudentTable) {
        modal.style.display = 'block';
        loadPaymentDetails();
    }
}

async function loadPaymentDetails() {
    const loadingEl = document.getElementById('paymentDetailsLoading');
    const tableEl = document.getElementById('paymentDetailsTable');
    if (!loadingEl || !tableEl) {
        return;
    }
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    const result = await fetchPaymentDetails(paymentDetailsYear);
    paymentDetailsYear = result.year || paymentDetailsYear;
    
    loadingEl.style.display = 'none';
    tableEl.style.display = 'block';
    
    initializeDataTable(result.payments);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the Fee Collection button
    const feeCollectionBtn = document.querySelector('.fee-collection-btn');
    if (feeCollectionBtn && document.getElementById('paymentDetailsTable')) {
        feeCollectionBtn.addEventListener('click', openFeeCollectionModal);
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn && document.getElementById('paymentDetailsTable')) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('feeCollectionModal').style.display = 'none';
        });
    }
});

document.addEventListener('fee-year-change', (event) => {
    if (event?.detail?.year) {
        paymentDetailsYear = event.detail.year;
        loadPaymentDetails();
    }
});