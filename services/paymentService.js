const PaymentStatus = require('../models/paymentModel');
const User = require('../models/userModel');
const UserPG = require('../models/pg/userModel');
const razorpayInstance = require('../utils/razorpayInstance');
const { formatStudentPaymentDetails } = require('../dtos/paymentDTO');


const { RAZORPAY_ID_KEY } = process.env;


const getPaymentStatusService = async (userId) => {
    const currentYear = new Date().getFullYear();
    
    let paymentStatus = await PaymentStatus.findOne({ userId, year: currentYear });
    
    if (!paymentStatus) {
        const user = await UserPG.findByPk(userId);
        if (!user) throw new Error('User not found');
        paymentStatus = new PaymentStatus({ userId, userName: user.name, year: currentYear });
    }

    return paymentStatus;
};

const updatePaymentService = async (userId, year, month, quarter, isQuarterly) => {
     // Convert isQuarterly from string ('true'/'false') to boolean
    const isQuarterlyBool = isQuarterly === 'true';

    let paymentStatus = await PaymentStatus.findOne({ userId, year });

    if (!paymentStatus) {
        console.log('No existing payment status found, creating new one.');
        const user = await UserPG.findByPk(userId);
        if (!user) throw new Error('User not found');
        paymentStatus = new PaymentStatus({ userId, userName: user.name, year: currentYear });
    }        if (isQuarterlyBool) {
        // Validate quarter (must be a number between 1 and 4)
        const quarterNum = parseInt(quarter, 10);
        if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
            const error = new Error('Invalid quarter value. Must be between 1 and 4.');
            error.status = 400;
            throw error;
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
            const error = new Error('Invalid month value. Must be between 0 and 11.');
            error.status = 400;
            throw error;
        }

        
        paymentStatus.months.set(String(monthNum), 'Paid');
    }

    await paymentStatus.save();
    return paymentStatus;
    
};

const getStudentPaymentDetailsService = async () => {
    // Get all users from PostgreSQL
        const users = await UserPG.findAll({ raw: true }); 

        // Get payment statuses for current year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
        const currentQuarter = Math.floor(currentMonth / 3) + 1; // Calculate current quarter (1-4)
        
        const paymentStatuses = await PaymentStatus.find({ year: currentYear }).lean(); 
        
        return formatStudentPaymentDetails(users, paymentStatuses, currentYear, currentMonth, currentQuarter);
};

const createOrderService = async (body, userId) => {
    const { name, amount, description, email, contact, year, month, quarter, isQuarterly } = body;
    const user = await UserPG.findByPk(userId);
    if (!user) throw new Error('User not found');
       
    let paymentStatus = await PaymentStatus.findOne({ userId, year }) || new PaymentStatus({ userId, userName: user.name, year: currentYear });

    if (isQuarterly) {
        const startMonth = (quarter - 1) * 3;
        for (let i = startMonth; i < startMonth + 3; i++) {
            if (paymentStatus.months.get(String(i)) === 'Paid') {
                const error = new Error('Some months in this quarter are already paid.');
                error.status = 400;
                throw error;
            }
        }
    } else {
        const derivedQuarter = Math.floor(month / 3) + 1;
        if (paymentStatus.quarters.get(String(derivedQuarter)) === 'Paid') {
            const error = new Error('This quarter is already paid.');
            error.status = 400;
            throw error;
        }
    }

    const amountInPaise = Math.round(amount * 100);
    const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: { paymentFor: description, userEmail: email }
    };

    return new Promise((resolve, reject) => {
        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                return reject({
                    status: 500,
                    message: 'Failed to create order with Razorpay'
                });
            }

            resolve({
                order_id: order.id,
                amount: amountInPaise,
                key_id: RAZORPAY_ID_KEY,
                product_name: name,
                description,
                contact,
                name,
                email
            });
        });
    });
};



module.exports = {
    getPaymentStatusService,
    updatePaymentService,
    getStudentPaymentDetailsService,
    createOrderService
   
};