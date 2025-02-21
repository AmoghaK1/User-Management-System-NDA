const express = require('express');
const payment_route = express();

const bodyParser = require('body-parser');
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended: true }));
const auth = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');

// Update the route name to match the dashboard purpose
// payment_route.get('/accounts', auth.ensureAuthenticated ,paymentController.renderDashboard); 
payment_route.get('/select-payment', auth.ensureAuthenticated, paymentController.selectPaymentMethod);
payment_route.post('/select-payment', auth.ensureAuthenticated, paymentController.selectPaymentMethod);

payment_route.post('/createOrder', auth.ensureAuthenticated,paymentController.createOrder);
payment_route.get('/accounts/monthly',auth.ensureAuthenticated, paymentController.renderMonthly); // Optional payment verification
payment_route.get('/accounts/quarterly',auth.ensureAuthenticated, paymentController.renderQuaterly); // Optional payment verification
payment_route.post('/initiate',auth.ensureAuthenticated, paymentController.createOrder);
payment_route.post('/verify',auth.ensureAuthenticated, paymentController.verifyPayment);
payment_route.post('/switch-plan',auth.ensureAuthenticated, paymentController.switchPaymentPlan);

// Receipt operations
payment_route.get('/receipt/:method/:period/:transactionId',auth.ensureAuthenticated, paymentController.generateReceipt);
payment_route.get('/receipts/download-all',auth.ensureAuthenticated, paymentController.downloadAllReceipts); 

module.exports = payment_route;