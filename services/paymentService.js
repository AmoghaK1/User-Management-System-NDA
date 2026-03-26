const PaymentStatus = require('../models/paymentModel');
const User = require('../models/userModel');
const razorpayInstance = require('../utils/razorpayInstance');
const { formatStudentPaymentDetails } = require('../dtos/paymentDTO');
const {
    getMonthFeeSettings,
    getQuarterMonthIndices,
    getHalfYearMonthIndices,
    calculateAmountForMonths
} = require('./feeModeService');


const { RAZORPAY_ID_KEY } = process.env;


const getPaymentStatusService = async (userId, year = null) => {
    const currentYear = year || new Date().getFullYear();
    
    let paymentStatus = await PaymentStatus.findOne({ userid: userId, year: currentYear });
    
    if (!paymentStatus) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        
        // Create default payment status
        const defaultMonths = {};
        for (let i = 0; i < 12; i++) {
            defaultMonths[i] = 'Pending';
        }
        const defaultQuarters = { 1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending' };
        const defaultHalfYearly = { 'half1': 'Pending', 'half2': 'Pending' };
        
        paymentStatus = await PaymentStatus.create({ 
            userid: userId, 
            username: user.name, 
            year: currentYear,
            months: defaultMonths,
            quarters: defaultQuarters,
            halfyearly: defaultHalfYearly
        });
    }

    return paymentStatus;
};

const updatePaymentService = async (userId, year, month, quarter, isQuarterly, halfId, isHalfYearly) => {
     // Convert isQuarterly and isHalfYearly from string ('true'/'false') to boolean
    const isQuarterlyBool = isQuarterly === 'true';
    const isHalfYearlyBool = isHalfYearly === 'true';

    let paymentStatus = await PaymentStatus.findOne({ userid: userId, year });

    if (!paymentStatus) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        
        const defaultMonths = {};
        for (let i = 0; i < 12; i++) {
            defaultMonths[i] = 'Pending';
        }
        const defaultQuarters = { 1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending' };
        const defaultHalfYearly = { 'half1': 'Pending', 'half2': 'Pending' };
        
        paymentStatus = await PaymentStatus.create({ 
            userid: userId, 
            username: user.name, 
            year,
            months: defaultMonths,
            quarters: defaultQuarters,
            halfyearly: defaultHalfYearly
        });
    }

    // Clone the JSONB objects to modify them
    const months = { ...paymentStatus.months };
    const quarters = { ...paymentStatus.quarters };
    const halfyearly = { ...paymentStatus.halfyearly };

    if (isHalfYearlyBool) {
        // Handle half-yearly payment
        if (!halfId || (halfId !== 'half1' && halfId !== 'half2')) {
            const error = new Error('Invalid half-year value. Must be half1 or half2.');
            error.status = 400;
            throw error;
        }

        // Update half-yearly status
        halfyearly[halfId] = 'Paid';
        
        // Update individual months (0-5 for half1, 6-11 for half2)
        const startMonth = halfId === 'half1' ? 0 : 6;
        for (let i = startMonth; i < startMonth + 6; i++) {
            months[String(i)] = 'Paid';
        }
    } else if (isQuarterlyBool) {
        // Validate quarter (must be a number between 1 and 4)
        const quarterNum = parseInt(quarter, 10);
        if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
            const error = new Error('Invalid quarter value. Must be between 1 and 4.');
            error.status = 400;
            throw error;
        }

        quarters[String(quarterNum)] = 'Paid';
        const startMonth = (quarterNum - 1) * 3;
        for (let i = startMonth; i < startMonth + 3; i++) {
            months[String(i)] = 'Paid';
        }
    } else {
        // Validate month (must be a number between 0 and 11)
        const monthNum = parseInt(month, 10);
        if (isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
            const error = new Error('Invalid month value. Must be between 0 and 11.');
            error.status = 400;
            throw error;
        }

        months[String(monthNum)] = 'Paid';
    }

    const updatedPayment = await PaymentStatus.updateById(paymentStatus.id, {
        months,
        quarters,
        halfyearly
    });
    
    return updatedPayment;
};

const getStudentPaymentDetailsService = async (year) => {
    const users = await User.find({}); 

    const now = new Date();
    const availableYearsRaw = await PaymentStatus.listYears();
    let availableYears = availableYearsRaw && availableYearsRaw.length
        ? availableYearsRaw
        : [now.getFullYear()];

    const requestedYear = parseInt(year, 10) || availableYears.sort((a, b) => b - a)[0] || now.getFullYear();
    if (!availableYears.includes(requestedYear)) {
        availableYears.push(requestedYear);
    }
    availableYears = Array.from(new Set(availableYears)).sort((a, b) => b - a);

    const isCurrentYear = requestedYear === now.getFullYear();
    const currentMonth = isCurrentYear ? now.getMonth() : 11;
    const currentQuarter = isCurrentYear ? Math.floor(currentMonth / 3) + 1 : 4;

    const paymentStatuses = await PaymentStatus.find({ year: requestedYear }); 
    const formattedPayments = formatStudentPaymentDetails(
        users,
        paymentStatuses,
        requestedYear,
        currentMonth,
        currentQuarter
    );

    return {
        payments: formattedPayments,
        year: requestedYear,
        availableYears
    };
};

const createOrderService = async (body, userId) => {
    const { name, description, email, contact, year, month, quarter, isQuarterly, halfId, isHalfYearly, lateFee } = body;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
       
    let paymentStatus = await PaymentStatus.findOne({ userid: userId, year });
    
    if (!paymentStatus) {
        const defaultMonths = {};
        for (let i = 0; i < 12; i++) {
            defaultMonths[i] = 'Pending';
        }
        const defaultQuarters = { 1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending' };
        const defaultHalfYearly = { 'half1': 'Pending', 'half2': 'Pending' };
        
        paymentStatus = await PaymentStatus.create({ 
            userid: userId, 
            username: user.name, 
            year,
            months: defaultMonths,
            quarters: defaultQuarters,
            halfyearly: defaultHalfYearly
        });
    }

    if (isHalfYearly) {
        // Check if half-year months are already paid
        const startMonth = halfId === 'half1' ? 0 : 6;
        for (let i = startMonth; i < startMonth + 6; i++) {
            if (paymentStatus.months[String(i)] === 'Paid') {
                const error = new Error('Some months in this half-year are already paid.');
                error.status = 400;
                throw error;
            }
        }
    } else if (isQuarterly) {
        const startMonth = (quarter - 1) * 3;
        for (let i = startMonth; i < startMonth + 3; i++) {
            if (paymentStatus.months[String(i)] === 'Paid') {
                const error = new Error('Some months in this quarter are already paid.');
                error.status = 400;
                throw error;
            }
        }
    } else {
        const derivedQuarter = Math.floor(month / 3) + 1;
        if (paymentStatus.quarters[String(derivedQuarter)] === 'Paid') {
            const error = new Error('This quarter is already paid.');
            error.status = 400;
            throw error;
        }
    }

    const targetYear = year || new Date().getFullYear();
    const settings = await getMonthFeeSettings(targetYear);
    const monthlyFee = Number(user.exam_fee) || 0;
    const lateFeeAmount = Number(lateFee) || 0;
    let baseAmount = 0;

    if (isHalfYearly) {
        const monthIndices = getHalfYearMonthIndices(halfId);
        baseAmount = calculateAmountForMonths(monthlyFee, monthIndices, settings);
    } else if (isQuarterly) {
        const monthIndices = getQuarterMonthIndices(quarter);
        baseAmount = calculateAmountForMonths(monthlyFee, monthIndices, settings);
    } else {
        const monthIndex = Number(month);
        baseAmount = calculateAmountForMonths(monthlyFee, [monthIndex], settings);
    }

    const finalAmount = Math.round((baseAmount + lateFeeAmount) * 100) / 100;
    if (finalAmount <= 0) {
        const error = new Error('No payable fee amount for the selected period.');
        error.status = 400;
        throw error;
    }

    const amountInPaise = Math.round(finalAmount * 100);
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