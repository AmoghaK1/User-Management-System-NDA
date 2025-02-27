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
payment_route.post('/update-payment-month', ensureAuthenticated, paymentController.updatePaymentMonth);
payment_route.post('/update-payment-quarter', ensureAuthenticated, paymentController.updatePaymentQuarter);
payment_route.get('/payment-status', ensureAuthenticated, paymentController.getPaymentStatus);
module.exports = payment_route;