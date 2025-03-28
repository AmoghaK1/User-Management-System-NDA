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
        const { name, amount, description, email, contact, year, month, quarter, isQuarterly } = req.body;
        const userId = req.user._id; // Assuming authentication middleware

        let paymentStatus = await PaymentStatus.findOne({ userId, year }) || new PaymentStatus({ userId, year });

        if (isQuarterly) {
            const startMonth = (quarter - 1) * 3;
            for (let i = startMonth; i < startMonth + 3; i++) {
                if (paymentStatus.months.get(String(i)) === 'Paid') {
                    return res.status(400).json({ success: false, msg: 'Some months in this quarter are already paid.' });
                }
            }
        } else {
            const quarter = Math.floor(month / 3) + 1;
            if (paymentStatus.quarters.get(String(quarter)) === 'Paid') {
                return res.status(400).json({ success: false, msg: 'This quarter is already paid.' });
            }
        }

        const amountInPaise = Math.round(amount * 100);
        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: { paymentFor: description, userEmail: email }
        };

        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                console.error('Razorpay error:', err);
                return res.status(500).json({ success: false, msg: 'Failed to create order' });
            }
            res.status(200).json({
                success: true,
                order_id: order.id,
                amount: amountInPaise,
                key_id: RAZORPAY_ID_KEY,
                product_name: name,
                description,
                contact,
                name: name,
                email
            });
        });
    } catch (error) {
        console.error('createOrder error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};

const updatePayment = async (req, res) => {
    try {
        const { userId, year, month, quarter, isQuarterly } = req.body;
        
        // Convert isQuarterly from string ('true'/'false') to boolean
        const isQuarterlyBool = isQuarterly === 'true';

        let paymentStatus = await PaymentStatus.findOne({ userId, year });

        if (!paymentStatus) {
            console.log('No existing payment status found, creating new one.');
            paymentStatus = new PaymentStatus({ userId, year });
        }

         if (isQuarterlyBool) {
            // Validate quarter (must be a number between 1 and 4)
            const quarterNum = parseInt(quarter, 10);
            if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
                return res.status(400).json({ error: 'Invalid quarter value. Must be between 1 and 4.' });
            }

            
            paymentStatus.quarters.set(String(quarterNum), 'Paid');
            const startMonth = (quarterNum - 1) * 3;
            for (let i = startMonth; i < startMonth + 3; i++) {
                paymentStatus.months.set(String(i), 'Paid');
            }
        } else {
            // Validate month (must be a number between 0 and 11)
            const monthNum = parseInt(month, 10);
            if (isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
                return res.status(400).json({ error: 'Invalid month value. Must be between 0 and 11.' });
            }

            
            paymentStatus.months.set(String(monthNum), 'Paid');
        }

        await paymentStatus.save();
        

        // Send a success response
        return res.status(200).json({ message: 'Payment status updated successfully', paymentStatus });
    } catch (error) {
        console.error('Error updating payment status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const paymentStatus = await PaymentStatus.findOne({ userId, year: new Date().getFullYear() }) || 
            new PaymentStatus({ userId, year: new Date().getFullYear() });
        res.status(200).json({
            success: true,
            paymentStatus: {
                year: paymentStatus.year,
                months: Object.fromEntries(paymentStatus.months),
                quarters: Object.fromEntries(paymentStatus.quarters)
            }
        });
    } catch (error) {
        console.error('getPaymentStatus error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};

module.exports = {
    renderDashboard,
    createOrder,
    updatePayment,
    getPaymentStatus
};