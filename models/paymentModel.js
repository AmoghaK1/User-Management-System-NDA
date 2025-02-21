const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["monthly", "quarterly"], required: true }, // Payment method
    monthsPaid: [{ type: Number }], // Array storing paid months (e.g., [1, 2] for Jan, Feb)
    quartersPaid: [{ type: Number }], // Array storing paid quarters (e.g., [1] for Q1)
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
});

// Automatically mark payments before 2024 as paid
PaymentSchema.pre("save", function (next) {
    if (this.paymentDate.getFullYear() < 2024) {
        this.monthsPaid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Mark all months as paid
        this.quartersPaid = [1, 2, 3, 4]; // Mark all quarters as paid
    }
    next();
});

module.exports = mongoose.model("Payment", PaymentSchema);
