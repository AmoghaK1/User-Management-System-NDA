const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    paymentType: {
        type: String,
        enum:['monthly','quarterly'],
        required:true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    amount:{
        type:Number,
        require:true
    },
    period:{
        type:String,
        required:true
    }
});

module.exports = mongoose.model('Payment',paymentSchema);
