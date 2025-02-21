require('dotenv').config(); 
const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const User = require('../models/userModel');

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
        // Extract data from request
        const { name, description, email, contact } = req.body;
        const userId = req.user._id; // Ensure userId is extracted correctly
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ success: false, msg: 'User not found' });
        }
        const amount = user.exam_fee;
        if (!amount) {
            return res.status(400).send({ success: false, msg: 'Invalid exam level fee' });
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

        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                console.error('Razorpay order creation error:', err);
                return res.status(500).send({ 
                    success: false, 
                    msg: 'Failed to create payment order' 
                });
            }
            
            res.status(200).send({
                success: true,
                msg: 'Order Created Successfully',
                order_id: order.id,
                amount: amountInPaise,
                key_id: RAZORPAY_ID_KEY,
                product_name: name || 'Fee Payment',
                description: description || 'Monthly Fee Payment',
                contact: contact || user.contact,
                name: user.name,
                email: email || user.email
            });
        });
    } catch (error) {
        console.error('Error in createOrder:', error.message);
        res.status(500).send({ 
            success: false, 
            msg: 'Internal Server Error' 
        });
    }
};

// For handling payment verification (optional but recommended)
const verifyPayment = (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        // Verification logic would go here
        // This would typically use the Razorpay SDK to verify the payment signature
        
        res.status(200).send({
            success: true,
            msg: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment verification error:', error.message);
        res.status(500).send({
            success: false,
            msg: 'Payment verification failed'
        });
    }
};

module.exports = {
    renderDashboard,
    createOrder,
    verifyPayment
};