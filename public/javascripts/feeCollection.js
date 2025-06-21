// feeCollection.js
let paymentDetailsTable;

// In feeCollection.js
async function fetchPaymentDetails() {
    try {
        const response = await fetch('/student-payment-details', { credentials: 'include' });
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        console.log('Raw payment details received:', data); // Debug log
        
        if (data.success) {
            console.log('Formatted payments:', data.payments); // Debug log
            return data.payments;
        } else {
            console.error('Failed to fetch payment details');
            return [];
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

function initializeDataTable(data) {
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
    if (modal) {
        modal.style.display = 'block';
    }
    
    loadPaymentDetails();
}

async function loadPaymentDetails() {
    // Show loading spinner
    document.getElementById('paymentDetailsLoading').style.display = 'block';
    document.getElementById('paymentDetailsTable').style.display = 'none';
    
    // Fetch payment details
    const paymentDetails = await fetchPaymentDetails();
    
    // Hide loading spinner
    document.getElementById('paymentDetailsLoading').style.display = 'none';
    document.getElementById('paymentDetailsTable').style.display = 'block';
    
    // Initialize DataTable with the fetched data
    initializeDataTable(paymentDetails);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the Fee Collection button
    const feeCollectionBtn = document.querySelector('.fee-collection-btn');
    if (feeCollectionBtn) {
        feeCollectionBtn.addEventListener('click', openFeeCollectionModal);
    }
    
    // Add event listener to close modal
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('feeCollectionModal').style.display = 'none';
        });
    }
});