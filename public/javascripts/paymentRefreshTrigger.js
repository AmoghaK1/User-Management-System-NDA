// Auto-refresh fee collection when payments are made
// This script should be included on pages where payments can be updated

document.addEventListener('DOMContentLoaded', function() {
    // Listen for payment form submissions
    const paymentForms = document.querySelectorAll('form[action*="update-fee"], form[action*="update-payment"]');
    
    paymentForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Add a small delay to allow the form to submit and process
            setTimeout(() => {
                // Trigger fee collection refresh event
                triggerFeeCollectionRefresh();
            }, 2000);
        });
    });
    
    // Listen for successful payment callbacks (for online payments)
    window.addEventListener('paymentSuccess', function(event) {
        console.log('💰 Payment success detected:', event.detail);
        triggerFeeCollectionRefresh();
    });
    
    // Listen for Razorpay payment success
    if (window.Razorpay) {
        const originalSuccess = window.paymentSuccessHandler || function() {};
        window.paymentSuccessHandler = function(response) {
            originalSuccess(response);
            triggerFeeCollectionRefresh();
        };
    }
});

function triggerFeeCollectionRefresh() {
    // Send a signal to refresh fee collection data
    fetch('/fee-collection-data', { 
        method: 'HEAD',  // Just a ping to trigger any server-side refresh logic
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-Action': 'refresh-trigger'
        }
    }).catch(error => {
        console.log('Fee collection refresh trigger sent');
    });
    
    // Dispatch custom event for any listening components
    window.dispatchEvent(new CustomEvent('feeCollectionRefresh', {
        detail: {
            timestamp: new Date().toISOString(),
            reason: 'Payment completed'
        }
    }));
    
    console.log('🔄 Fee collection refresh triggered due to payment update');
}