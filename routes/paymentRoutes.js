const express = require('express');
const payment_route = express();

const bodyParser = require('body-parser');
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended: true }));

const paymentController = require('../controllers/paymentController');
const { ensureAuthenticated } = require('../middlewares/auth');

// Update the route name to match the dashboard purpose
payment_route.get('/accounts', ensureAuthenticated, paymentController.renderDashboard);
payment_route.post('/createOrder', ensureAuthenticated, paymentController.createOrder);
payment_route.post('/update-payment', ensureAuthenticated, paymentController.updatePayment);
payment_route.get('/payment-status', ensureAuthenticated, paymentController.getPaymentStatus);
payment_route.get('/student-payment-details', ensureAuthenticated, paymentController.getStudentPaymentDetails);
module.exports = payment_route;