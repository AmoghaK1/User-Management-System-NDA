const mongoose = require("mongoose");

const feeStructure = {
    "Senior Batch": 1100,
    "Prarambhik": 1000,
    "Praveshika Pratham": 1000,
    "Praveshika Purna": 1000,
    "Madhyama Pratham": 1000,
    "Madhyama Purna": 1000,
    "Visharad Pratham": 1200,
    "Visharad Purna": 1200,
    "Alankar Pratham": 1500,
    "Alankar Purna": 1500,
    "TMA-BA": 1200
}

const userSchema = new mongoose.Schema ({
    name : {
        type: String,
        required:true
    },
    email : {
        type: String,
        required:true
    },
    birthdate : {
        type: Date,
        required:true
    },
    age : {
        type: Number,
        required:true
    },
    student_ph_no : {
        type: String,
        required:true,
        trim: true
    },
    exam_level : {
        type: String,
        required:true
    },
    exam_fee: { 
        type: Number, default: function() { return feeStructure[this.exam_level] || 800; } }, // Default 800
    password : {
        type: String,
        required:true
    },
    is_admin : {
        type: Number,
        required:true
    },
    is_verified : {
        type: Boolean
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    createdAt: {  // Changed from joinDate to createdAt
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String,
        default: "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/oi0mzzlbzrjspastm3dl",
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
    }, {
    timestamps: true  // This will automatically add createdAt and updatedAt fields
    
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;


