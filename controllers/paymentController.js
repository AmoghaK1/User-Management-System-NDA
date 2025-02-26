require('dotenv').config();
const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const User = require('../models/userModel');
const PaymentStatus = require('../models/paymentModel');

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});

const renderDashboard = async (req, res) => {
    try {
        res.render('accounts2');
    } catch (err) {
        console.error('Error rendering page:', err.message);
        res.status(500).send('Internal Server Error');
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