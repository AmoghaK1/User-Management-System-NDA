const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Link to the user
    year: { type: Number, required: true }, // Year of payment
    months: {
        type: Map,
        of: String, // Payment status for each month (e.g., 'Paid', 'Pending', 'Upcoming')
        default: {
            0: 'Pending', // January
            1: 'Pending', // February
            2: 'Pending', // March
            3: 'Pending', // April
            4: 'Pending', // May
            5: 'Pending', // June
            6: 'Pending', // July
            7: 'Pending', // August
            8: 'Pending', // September
            9: 'Pending', // October
            10: 'Pending', // November
            11: 'Pending' // December
        }
    },
    quarters: {
        type: Map,
        of: String, // Payment status for each quarter (e.g., 'Paid', 'Pending', 'Upcoming')
        default: {
            1: 'Pending', // Q1 (January, February, March)
            2: 'Pending', // Q2 (April, May, June)
            3: 'Pending', // Q3 (July, August, September)
            4: 'Pending'  // Q4 (October, November, December)
        }
    }
});

module.exports = mongoose.model('PaymentStatus', paymentStatusSchema);