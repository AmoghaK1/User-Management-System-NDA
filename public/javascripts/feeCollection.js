// feeCollection.js
let paymentDetailsTable;

async function fetchPaymentDetails() {
    try {
        const response = await fetch('/student-payment-details', { credentials: 'include' });
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.success) {
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
            { data: 'status', title: 'Status',
              render: function(data) {
                  return `<span class="badge bg-success text-white">${data}</span>`;
              }
            }
        ],
        order: [[4, 'desc'], [3, 'desc']],
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
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