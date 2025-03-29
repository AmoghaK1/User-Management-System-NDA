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
                name: 'Amogha Khare',
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

        console.log('Received updatePayment request with:', { userId, year, month, quarter, isQuarterly });

        // Convert isQuarterly from string ('true'/'false') to boolean
        const isQuarterlyBool = isQuarterly === 'true';

        let paymentStatus = await PaymentStatus.findOne({ userId, year });

        if (!paymentStatus) {
            console.log('No existing payment status found, creating new one.');
            paymentStatus = new PaymentStatus({ userId, year });
        }

        console.log('Is quarterly:', isQuarterlyBool);

        if (isQuarterlyBool) {
            // Validate quarter (must be a number between 1 and 4)
            const quarterNum = parseInt(quarter, 10);
            if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
                return res.status(400).json({ error: 'Invalid quarter value. Must be between 1 and 4.' });
            }

            console.log('Updating quarterly payment status for quarter:', quarterNum);
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

            console.log('Updating monthly payment status for month:', monthNum);
            paymentStatus.months.set(String(monthNum), 'Paid');
        }

        await paymentStatus.save();
        console.log('Payment status successfully updated:', paymentStatus);

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
const getStudentPaymentDetails = async (req, res) => {
    try {
        // Get all users
        const users = await User.find({}).lean(); 
        console.log('Total users found:', users.length);
        
        // Get payment statuses for current year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
        const currentQuarter = Math.floor(currentMonth / 3) + 1; // Calculate current quarter (1-4)
        
        console.log(`Current month: ${currentMonth}, Current quarter: ${currentQuarter}`);
        
        const paymentStatuses = await PaymentStatus.find({ year: currentYear }).lean(); 
        
        console.log('Payment statuses found:', paymentStatuses.length);
        
        const formattedPayments = [];
        
        // Iterate through all users
        for (const user of users) {
            // Skip users without an _id
            if (!user || !user._id) {
                console.warn('Skipping user with invalid _id:', user);
                continue;
            }

            // Find the corresponding payment status
            const paymentStatus = paymentStatuses.find(status => 
                status.userId && status.userId.toString() === user._id.toString()
            );
            
            console.log(`Processing user: ${user.name}, Payment Status:`, paymentStatus);
            
            // Default status for each month
            const monthStatuses = Array(12).fill('Pending');
            const quarterStatuses = Array(4).fill('Pending');
            
            if (paymentStatus) {
                // Update month statuses
                if (paymentStatus.months) {
                    Object.entries(paymentStatus.months).forEach(([monthIndex, status]) => {
                        const index = parseInt(monthIndex);
                        if (!isNaN(index) && index >= 0 && index < 12) {
                            monthStatuses[index] = status;
                        }
                    });
                }
                
                // Update quarter statuses
                if (paymentStatus.quarters) {
                    Object.entries(paymentStatus.quarters).forEach(([quarterIndex, status]) => {
                        const index = parseInt(quarterIndex) - 1; // Adjust index since quarters start at 1
                        if (!isNaN(index) && index >= 0 && index < 4) {
                            quarterStatuses[index] = status;
                        }
                    });
                }
            }
            
            // Add monthly payment details - ONLY UP TO CURRENT MONTH
            for (let index = 0; index <= currentMonth; index++) {
                const status = monthStatuses[index];
                const monthName = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ][index];
                
                console.log(`Monthly Payment - User: ${user.name}, Month: ${monthName}, Status: ${status}`);

                formattedPayments.push({
                    studentName: user.name || 'Unknown',
                    studentEmail: user.email || 'N/A',
                    paymentType: 'Monthly',
                    period: `${monthName} ${currentYear}`,
                    year: currentYear,
                    status: status
                });
            }
            
            // Add quarterly payment details - ONLY UP TO CURRENT QUARTER
            for (let index = 0; index < currentQuarter; index++) {
                const status = quarterStatuses[index];
                
                console.log(`Quarterly Payment - User: ${user.name}, Quarter: Q${index + 1}, Status: ${status}`);

                formattedPayments.push({
                    studentName: user.name || 'Unknown',
                    studentEmail: user.email || 'N/A',
                    paymentType: 'Quarterly',
                    period: `Q${index + 1} ${currentYear}`,
                    year: currentYear,
                    status: status
                });
            }
        }
        
        console.log('Total formatted payments:', formattedPayments.length);
        
        res.status(200).json({
            success: true,
            payments: formattedPayments
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error', error: error.message });
    }
};
module.exports = {
    renderDashboard,
    createOrder,
    updatePayment,
    getPaymentStatus,
    getStudentPaymentDetails
};