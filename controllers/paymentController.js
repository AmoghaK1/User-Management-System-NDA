require('dotenv').config(); 
const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const User = require('../models/userModel');
const Payment = require('../models/paymentModel');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});

const renderDashboard = async (req, res) => {
    try {
        res.render('accounts', { user: req.user });
    } catch (err) {
        console.error('Error rendering page:', err.message);
        res.status(500).send('Internal Server Error');
    }
};

const selectPaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id; // Ensure this matches your authentication middleware

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        // Check if user already has a payment method
        const existingPayment = await Payment.findOne({ userId });

        // If user already selected a payment method, redirect to appropriate view
        if (existingPayment) {
            return res.redirect(existingPayment.method === "monthly" ? '/accounts/monthly' : '/accounts/quarterly');
        }

        // For GET requests, show the selection form
        if (req.method === 'GET') {
            return res.render('payment_selection', { user });
        }

        // For POST requests, handle the form submission
        const { method } = req.body;

        // Validate method
        if (!method || !['monthly', 'quarterly'].includes(method)) {
            return res.status(400).render('error', { message: 'Invalid payment method selected' });
        }

        // Create new payment record
        const amount = method === 'monthly' ? 800 : 2400;

        const newPayment = new Payment({
            userId,
            method,
            amount,
            monthsPaid: [],
            quartersPaid: []
        });

        await newPayment.save();

        // Redirect to appropriate dashboard
        return res.redirect(method === 'monthly' ? '/accounts/monthly' : '/accounts/quarterly');

    } catch (error) {
        console.error('Error selecting payment method:', error);
        res.status(500).render('error', { message: 'Error processing payment selection' });
    }
};
const ensurePaymentMethodSelected = async (req, res, next) => {
    try {
        const userId = req.user.id; // Ensure this matches your authentication middleware

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        // Check if payment method is selected
        const payment = await Payment.findOne({ userId });
        if (!payment) {
            return res.redirect('/accounts/select-payment');
        }

        next();
    } catch (error) {
        console.error('Error checking payment method:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};

const renderMonthly = async (req, res) => {
    try {
        const userId = req.user.id; // Ensure this matches your authentication middleware

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        // Get user payment data
        const payment = await Payment.findOne({ userId, method: "monthly" });
        if (!payment) {
            return res.status(404).render('error', { message: 'No monthly payment plan found for this user' });
        }

        // Current date for determining payment status
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // 1-12 format
        const currentYear = currentDate.getFullYear();

        // Setup monthly payment history (paid, pending, upcoming)
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Generate payment history data
        const paidMonths = payment.monthsPaid || [];
        const paymentHistory = [];

        for (let i = 1; i <= 12; i++) {
            const isPaid = paidMonths.includes(i);
            const monthIndex = i - 1;

            if (isPaid) {
                paymentHistory.push({
                    name: months[monthIndex],
                    fullName: `${months[monthIndex]} ${currentYear}`,
                    status: 'paid',
                    paymentDate: new Date(currentYear, monthIndex, 5), // Assumes paid on 5th
                    amount: payment.amount,
                    transactionId: `TXN${(Math.random().toString(36).substr(2, 6)).toUpperCase()}`
                });
            } else if (!isPaid && i === currentMonth) {
                paymentHistory.push({
                    name: months[monthIndex],
                    fullName: `${months[monthIndex]} ${currentYear}`,
                    status: 'pending',
                    dueDate: new Date(currentYear, monthIndex, 5),
                    amount: payment.amount
                });
            } else if (!isPaid && i === currentMonth + 1) {
                paymentHistory.push({
                    name: months[monthIndex],
                    fullName: `${months[monthIndex]} ${currentYear}`,
                    status: 'upcoming',
                    dueDate: new Date(currentYear, monthIndex, 5),
                    amount: payment.amount
                });
            }
        }

        // Separate by status
        const paid = paymentHistory.filter(p => p.status === 'paid');
        const pending = paymentHistory.filter(p => p.status === 'pending');
        const upcoming = paymentHistory.filter(p => p.status === 'upcoming');

        res.render('acc_monthly', {
            user,
            payment,
            paymentHistory: { paid, pending, upcoming }
        });
    } catch (error) {
        console.error('Error fetching monthly payments:', error);
        res.status(500).render('error', { message: 'Error loading payment data' });
    }
};

const renderQuaterly = async (req, res) => {
    try {
        const userId = req.user._id;

        // Validate user existence
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        // Get user payment data
        const payment = await Payment.findOne({ userId, method: "quarterly" });
        if (!payment) {
            return res.status(404).render('error', { message: 'No quarterly payment plan found for this user' });
        }

        // Current date for determining payment status
        const currentDate = new Date();
        const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1; // 1-4 format
        const currentYear = currentDate.getFullYear();

        // Generate quarterly payment data
        const paidQuarters = payment.quartersPaid || [];
        const quarterlyPayments = [];
        const quarterMonths = [
            ['January', 'February', 'March'],
            ['April', 'May', 'June'],
            ['July', 'August', 'September'],
            ['October', 'November', 'December']
        ];

        // Generate payment data for each quarter
        for (let q = 1; q <= 4; q++) {
            const isPaid = paidQuarters.includes(q);
            const months = quarterMonths[q - 1];
            const startMonth = (q - 1) * 3;

            if (isPaid) {
                // Data for a paid quarter
                quarterlyPayments.push({
                    quarter: q,
                    label: `Q${q} ${currentYear} (${months[0].substr(0, 3)}-${months[2].substr(0, 3)})`,
                    status: 'paid',
                    paymentDate: new Date(currentYear, startMonth, 5),
                    amount: payment.amount,
                    transactionId: `TXN${(Math.random().toString(36).substr(2, 6)).toUpperCase()}`,
                    monthsCovered: months,
                    periodStart: new Date(currentYear, startMonth, 1),
                    periodEnd: new Date(currentYear, startMonth + 2, 31)
                });
            } else if (!isPaid && q === currentQuarter) {
                // Current unpaid quarter is pending
                quarterlyPayments.push({
                    quarter: q,
                    label: `Q${q} ${currentYear} (${months[0].substr(0, 3)}-${months[2].substr(0, 3)})`,
                    status: 'pending',
                    dueDate: new Date(currentYear, startMonth, 1),
                    amount: payment.amount,
                    monthsCovered: months,
                    periodStart: new Date(currentYear, startMonth, 1),
                    periodEnd: new Date(currentYear, startMonth + 2, 31)
                });
            } else if (!isPaid && q > currentQuarter) {
                // Future quarters are upcoming
                quarterlyPayments.push({
                    quarter: q,
                    label: `Q${q} ${currentYear} (${months[0].substr(0, 3)}-${months[2].substr(0, 3)})`,
                    status: 'upcoming',
                    dueDate: new Date(currentYear, startMonth, 1),
                    amount: payment.amount,
                    monthsCovered: months,
                    periodStart: new Date(currentYear, startMonth, 1),
                    periodEnd: new Date(currentYear, startMonth + 2, 31)
                });
            }
        }

        // Separate by status
        const paidPayments = quarterlyPayments.filter(p => p.status === 'paid');
        const upcomingPayments = quarterlyPayments.filter(p => p.status === 'upcoming');
        const pendingPayments = quarterlyPayments.filter(p => p.status === 'pending');

        // Render the EJS template with the data
        res.render('acc_quaterly', {
            user,
            payment,
            paidQuarters: paidPayments,
            upcomingQuarters: upcomingPayments,
            pendingQuarters: pendingPayments,
            paymentSchedule: quarterlyPayments
        });
    } catch (error) {
        console.error('Error fetching quarterly payments:', error);
        res.status(500).render('error', { message: 'Error loading payment data' });
    }
};
const createOrder = async (req, res) => {
    try {
        const { method, paymentPeriod } = req.body;
        const userId = req.user._id;
        
        // Find the user's payment plan
        const payment = await Payment.findOne({ 
          userId: userId,
          method: method
        });
        
        if (!payment) {
          return res.status(404).json({ error: 'Payment plan not found' });
        }
        
        // Parse period from form data
        let amount = payment.amount;
        let periodType, periodValue;
        
        if (method === 'monthly') {
          // Format: "Feb" or full month name
          periodType = 'month';
          const monthMap = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
          };
          periodValue = monthMap[paymentPeriod] || parseInt(paymentPeriod);
        } else {
          // Format: "1" or "Q1"
          periodType = 'quarter';
          periodValue = paymentPeriod.startsWith('Q') ? 
                       parseInt(paymentPeriod.substring(1)) : 
                       parseInt(paymentPeriod);
        }
        
        // Check if already paid
        if (method === 'monthly' && payment.monthsPaid.includes(periodValue)) {
          return res.status(400).json({ error: 'This period is already paid' });
        }
        
        if (method === 'quarterly' && payment.quartersPaid.includes(periodValue)) {
          return res.status(400).json({ error: 'This quarter is already paid' });
        }
        
        // Create Razorpay order
        const options = {
          amount: amount * 100, // Razorpay expects amount in paise
          currency: 'INR',
          receipt: `payment_${userId}_${method}_${periodValue}`,
          payment_capture: 1 // Auto-capture
        };
        
        const order = await razorpay.orders.create(options);
        
        // Send order details to client
        res.json({
          orderId: order.id,
          amount: order.amount / 100,
          currency: order.currency,
          paymentDetails: {
            userId,
            method,
            periodType,
            periodValue
          }
        });
      } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
      }
};

const verifyPayment = async (req, res) => {
    try {
        const { 
          razorpayOrderId, 
          razorpayPaymentId, 
          razorpaySignature,
          paymentDetails 
        } = req.body;
        
        // Verify payment signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const generatedSignature = hmac.digest('hex');
        
        if (generatedSignature !== razorpaySignature) {
          return res.status(400).json({ verified: false, error: 'Invalid payment signature' });
        }
        
        // Parse payment details
        const { userId, method, periodType, periodValue } = paymentDetails;
        
        // Update payment record
        const payment = await Payment.findOne({ userId, method });
        if (!payment) {
          return res.status(404).json({ verified: false, error: 'Payment plan not found' });
        }
        
        // Update the paid periods
        if (method === 'monthly') {
          if (!payment.monthsPaid.includes(periodValue)) {
            payment.monthsPaid.push(periodValue);
            payment.monthsPaid.sort((a, b) => a - b);
          }
        } else {
          if (!payment.quartersPaid.includes(periodValue)) {
            payment.quartersPaid.push(periodValue);
            payment.quartersPaid.sort((a, b) => a - b);
          }
        }
        
        // Save the updated payment
        await payment.save();
        
        res.json({ 
          verified: true,
          payment: {
            method,
            periodValue,
            transactionId: razorpayPaymentId
          } 
        });
      } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ verified: false, error: 'Payment verification failed' });
      }
};

const switchPaymentPlan = async (req, res) => {
    try {
        const { newPlan } = req.body;
        const userId = req.user._id;
        
        if (!['monthly', 'quarterly'].includes(newPlan)) {
          return res.status(400).json({ success: false, error: 'Invalid payment plan' });
        }
        
        // Check if user already has this payment plan
        const existingPlan = await Payment.findOne({
          userId,
          method: newPlan
        });
        
        if (existingPlan) {
          // User is already on this plan - set it as active in user preferences
          // Assuming you have a user preferences model or field
          await User.findByIdAndUpdate(userId, { activePlan: newPlan });
          
          return res.json({
            success: true,
            message: `Successfully switched to ${newPlan} plan`
          });
        }
        
        // Create new payment plan for user
        const planAmount = newPlan === 'monthly' ? 800 : 2400;
        
        const newPaymentPlan = new Payment({
          userId,
          method: newPlan,
          amount: planAmount,
          monthsPaid: [],
          quartersPaid: []
        });
        
        await newPaymentPlan.save();
        
        // Update user's active plan preference
        await User.findByIdAndUpdate(userId, { activePlan: newPlan });
        
        res.json({
          success: true,
          message: `Successfully created and switched to ${newPlan} plan`
        });
      } catch (error) {
        console.error('Error switching payment plan:', error);
        res.status(500).json({ success: false, error: 'Failed to switch payment plan' });
      }
};

const generateReceipt = async (req, res) => {
    try {
        const { method, period, transactionId } = req.params;
        const userId = req.user._id;
        
        // Find user's payment
        const payment = await Payment.findOne({
          userId,
          method
        });
        
        if (!payment) {
          return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Verify this transaction belongs to the user (implementation depends on how you store transaction IDs)
        // This is a placeholder check
        const isValidTransaction = true; // You would implement real verification here
        
        if (!isValidTransaction) {
          return res.status(403).json({ error: 'Invalid transaction' });
        }
        
        // Here you would generate the actual PDF receipt
        // This is just a placeholder response
        res.json({
          success: true,
          receiptDetails: {
            userId,
            method,
            period,
            transactionId,
            amount: payment.amount,
            date: new Date().toISOString()
          },
          message: 'Receipt generation would happen here'
        });
      } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).json({ error: 'Failed to generate receipt' });
      }
};

const downloadAllReceipts = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get all payments for this user
        const payments = await Payment.find({ userId });
        
        if (!payments || payments.length === 0) {
          return res.status(404).json({ error: 'No payments found' });
        }
        
        // Here you would generate a ZIP file with all receipts
        // This is just a placeholder response
        res.json({
          success: true,
          message: 'ZIP generation of all receipts would happen here',
          paymentCount: payments.length
        });
      } catch (error) {
        console.error('Error downloading receipts:', error);
        res.status(500).json({ error: 'Failed to download receipts' });
      }
};

module.exports = {
    renderDashboard,
    createOrder,
    verifyPayment,
    renderMonthly,
    renderQuaterly,
    switchPaymentPlan,
    generateReceipt,
    downloadAllReceipts,
    selectPaymentMethod,
    ensurePaymentMethodSelected
};