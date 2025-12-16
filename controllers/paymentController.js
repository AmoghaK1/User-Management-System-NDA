const { 
    getPaymentStatusService, 
    createOrderService, 
    updatePaymentService, 
    getStudentPaymentDetailsService 
} = require('../services/paymentService');
const { formatPaymentStatusDto } = require('../dtos/paymentDTO');
const feeCollectionEvents = require('../services/feeCollectionEvents');


const renderDashboard = async (req, res) => {
    try {
        res.render('student/accounts2');
    } catch (err) {
        console.error('Error rendering page:', err.message);
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        res.status(500).send('Internal Server Error');
    }
};

const renderQuarterlyPayments = async (req, res) => {
    try {
        res.render('student/quarterlyPayments');
    } catch (err) {
        console.error('Error rendering quarterly payments page:', err.message);
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        res.status(500).send('Internal Server Error');
    }
};

const renderHalfYearlyPayments = async (req, res) => {
    try {
        res.render('student/halfYearlyPayments');
    } catch (err) {
        console.error('Error rendering half-yearly payments page:', err.message);
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        res.status(500).send('Internal Server Error');
    }
};

const createOrder = async (req, res) => {
    try {
        const orderData = await createOrderService(req.body, req.user._id);  // userId from auth middleware
        res.status(200).json({ success: true, ...orderData });
    } catch (error) {
        console.error('createOrder error:', error);

        if (error.status) {
            return res.status(error.status).json({ success: false, msg: error.message });
        }

        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};


const updatePayment = async (req, res) => {
    try {
        const { userId, year, month, quarter, isQuarterly, halfId, isHalfYearly } = req.body;
        const paymentStatus = await updatePaymentService(userId, year, month, quarter, isQuarterly, halfId, isHalfYearly);

        // Emit real-time event for fee collection update
        feeCollectionEvents.notifyPaymentUpdate({
            userId,
            year,
            month,
            quarter,
            isQuarterly,
            halfId,
            isHalfYearly
        });

        console.log(`💰 Payment updated - User: ${userId}, Year: ${year}, Month: ${month}, Quarter: ${quarter}, Quarterly: ${isQuarterly}`);

        return res.status(200).json({
            message: 'Payment status updated successfully',
            paymentStatus,
            realTimeUpdate: true
        });
    } catch (error) {
        console.error('Error updating payment status:', error);

        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
};


const getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const year = req.query.year ? parseInt(req.query.year) : null;
        const paymentStatus = await getPaymentStatusService(userId, year);
        const dto = formatPaymentStatusDto(paymentStatus);

        res.status(200).json({ success: true, paymentStatus: dto });
    } catch (error) {
        console.error('getPaymentStatus error:', error);
        res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};

const getStudentPaymentDetails = async (req, res) => {
    try {
        
        const formattedPayments = await getStudentPaymentDetailsService();
        res.status(200).json({
            success: true,
            payments: formattedPayments
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        if(error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        res.status(500).json({ success: false, msg: 'Internal Server Error', error: error.message });
    }
};

module.exports = {
    renderDashboard,
    renderQuarterlyPayments,
    renderHalfYearlyPayments,
    createOrder,
    updatePayment,
    getPaymentStatus,
    getStudentPaymentDetails
};