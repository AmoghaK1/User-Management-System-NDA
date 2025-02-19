const express = require('express');
const payment_route = express();

const bodyParser = require('body-parser');
payment_route.use(bodyParser.json());
payment_route.use(bodyParser.urlencoded({ extended: true }));

const paymentController = require('../controllers/paymentController');

// Update the route name to match the dashboard purpose
payment_route.get('/accounts', paymentController.renderDashboard); 
payment_route.post('/createOrder', paymentController.createOrder);
payment_route.post('/verify-payment', paymentController.verifyPayment); // Optional payment verification endpoint

module.exports = payment_route;