require('dotenv').config();
const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const User = require('../models/userModel');
const PaymentStatus = require('../models/paymentModel');

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
        const { name, amount, description, email, contact, userId, year, month, isQuarterly } = req.body;

        // Fetch the payment status for the user
        let paymentStatus = await PaymentStatus.findOne({ userId, year });
        if (!paymentStatus) {
            paymentStatus = new PaymentStatus({
                userId,
                year,
                months: new Map(), // Initialize months as an empty Map
                quarters: new Map() // Initialize quarters as an empty Map
            });
        }

        if (isQuarterly) {
            // Check if any of the months in the quarter have been paid
            const startMonth = (month - 1) * 3;
            const endMonth = startMonth + 3;
            let anyMonthPaid = false;
            for (let i = startMonth; i < endMonth; i++) {
                if (paymentStatus.months.get(i) === 'Paid') {
                    anyMonthPaid = true;
                    break;
                }
            }

            if (anyMonthPaid) {
                return res.status(400).json({
                    success: false,
                    msg: 'Cannot pay quarterly because some months in this quarter have already been paid.'
                });
            }
        } else {
            // Check if the corresponding quarter has been paid
            const quarter = Math.floor(month / 3) + 1;
            if (paymentStatus.quarters.get(quarter) === 'Paid') {
                return res.status(400).json({
                    success: false,
                    msg: 'Cannot pay monthly because the corresponding quarter has already been paid.'
                });
            }
        }

        // Convert amount to paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                paymentFor: description || 'Fee Payment',
                userEmail: email || 'user@example.com'
            }
        };

        razorpayInstance.orders.create(options, async (err, order) => {
            if (err) {
                console.error('Razorpay order creation error:', err);
                return res.status(500).json({ 
                    success: false, 
                    msg: 'Failed to create payment order' 
                });
            }

            res.status(200).json({
                success: true,
                msg: 'Order Created Successfully',
                order_id: order.id,
                amount: amountInPaise,
                key_id: RAZORPAY_ID_KEY,
                product_name: name || 'Fee Payment',
                description: description || 'Monthly Fee Payment',
                contact: contact || '9876543210',
                name: 'Amogha Khare',
                email: email || 'amogha.khare@example.com'
            });
        });
    } catch (error) {
        console.error('Error in createOrder:', error.message);
        res.status(500).json({ 
            success: false, 
            msg: 'Internal Server Error' 
        });
    }
};
const updatePaymentMonth = async (req, res) => {
    try {
        const { userId, year, month } = req.body;

        // Update payment status for the specific month
        await PaymentStatus.findOneAndUpdate(
            { userId, year },
            { [`months.${month}`]: 'Paid' }, // Update the status for the specific month
            { upsert: true }
        );

        res.status(200).json({ success: true, msg: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};
const updatePaymentQuarter = async (req, res) => {
    try {
        const { userId, year, quarter } = req.body;

        // Update payment status for the specific quarter
        await PaymentStatus.findOneAndUpdate(
            { userId, year },
            { [`quarters.${quarter}`]: 'Paid' }, // Update the status for the specific quarter
            { upsert: true }
        );

        // Update the corresponding months
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 3;
        for (let i = startMonth; i < endMonth; i++) {
            await PaymentStatus.findOneAndUpdate(
                { userId, year },
                { [`months.${i}`]: 'Paid' }, // Update the status for the specific month
                { upsert: true }
            );
        }

        res.status(200).json({ success: true, msg: 'Payment status updated successfully' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};

const getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming you have user authentication middleware
        const paymentStatus = await PaymentStatus.find({ userId });
        res.status(200).json({ success: true, paymentStatus });
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};

module.exports = {
    renderDashboard,
    createOrder,
    updatePaymentMonth,
    updatePaymentQuarter,
    getPaymentStatus
};