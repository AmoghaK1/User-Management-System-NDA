// public/js/payment.js

// Function to initiate a payment
async function initiatePayment(method, paymentPeriod) {
    try {
      // Disable the button to prevent multiple clicks
      const payButton = event.target;
      payButton.disabled = true;
      payButton.textContent = 'Processing...';
      
      // Make API request to create Razorpay order
      const response = await fetch('/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          paymentPeriod
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate payment');
      }
      
      const orderData = await response.json();
      
      // Configure Razorpay options
      const options = {
        key: RAZORPAY_KEY_ID, // Set this value in your main layout or page
        amount: orderData.amount * 100, // Amount in paise
        currency: orderData.currency,
        name: "Your Company Name",
        description: `${method.charAt(0).toUpperCase() + method.slice(1)} Payment`,
        order_id: orderData.orderId,
        handler: function(response) {
          // When payment is successful
          verifyPayment(response, orderData.paymentDetails);
        },
        prefill: {
          name: document.getElementById('userName').value,
          email: document.getElementById('userEmail').value,
        },
        theme: {
          color: "#9333ea" // Purple color matching your UI
        },
        modal: {
          ondismiss: function() {
            // Re-enable the button if payment modal is dismissed
            payButton.disabled = false;
            payButton.textContent = 'Make Payment';
          }
        }
      };
      
      // Initialize Razorpay
      const razorpayInstance = new Razorpay(options);
      razorpayInstance.open();
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert('Payment initiation failed: ' + error.message);
      
      // Re-enable button
      payButton.disabled = false;
      payButton.textContent = 'Make Payment';
    }
  }
  
  // Function to verify payment after Razorpay success
  async function verifyPayment(razorpayResponse, paymentDetails) {
    try {
      const response = await fetch('/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
          paymentDetails
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment verification failed');
      }
      
      const result = await response.json();
      
      if (result.verified) {
        // Show success message
        showPaymentSuccess(result.payment);
      } else {
        throw new Error('Payment could not be verified');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      alert('Payment verification failed: ' + error.message);
    }
  }
  
  // Function to display payment success
  function showPaymentSuccess(payment) {
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
    successDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Payment successful! Transaction ID: ${payment.transactionId}</span>
      </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Refresh the page after 2 seconds
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
  
  // Event listeners for payment buttons
  document.addEventListener('DOMContentLoaded', function() {
    // Monthly payment button
    const monthlyPayButtons = document.querySelectorAll('[data-action="pay-monthly"]');
    monthlyPayButtons.forEach(button => {
      button.addEventListener('click', function() {
        const month = this.getAttribute('data-month');
        initiatePayment('monthly', month);
      });
    });
    
    // Quarterly payment button
    const quarterlyPayButtons = document.querySelectorAll('[data-action="pay-quarterly"]');
    quarterlyPayButtons.forEach(button => {
      button.addEventListener('click', function() {
        const quarter = this.getAttribute('data-quarter');
        initiatePayment('quarterly', quarter);
      });
    });
    
    // Switch plan button
    const switchPlanButton = document.getElementById('switchPlanButton');
    if (switchPlanButton) {
      switchPlanButton.addEventListener('click', async function() {
        try {
          const currentPlan = this.getAttribute('data-current-plan');
          const newPlan = currentPlan === 'monthly' ? 'quarterly' : 'monthly';
          
          const response = await fetch('/payments/switch-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newPlan
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to switch plan');
          }
          
          const result = await response.json();
          alert(result.message);
          window.location.href = `/${newPlan}`;
          
        } catch (error) {
          console.error('Plan switch error:', error);
          alert('Failed to switch plans: ' + error.message);
        }
      });
    }
  });