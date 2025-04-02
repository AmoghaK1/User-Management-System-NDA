const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    year: { type: Number, required: true },
    months: {
        type: Map,
        of: String,
        default: () => new Map(Array.from({ length: 12 }, (_, i) => [String(i), 'Pending']))
    },
    quarters: {
        type: Map,
        of: String,
        default: () => new Map(Array.from({ length: 4 }, (_, i) => [String(i + 1), 'Pending']))
    }
});

module.exports = mongoose.model('PaymentStatus', paymentStatusSchema);