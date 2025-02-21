const mongoose = require("mongoose");

const feeStructure = {
    "Prarambhik": 800,
    "Praveshika Pratham": 800,
    "Praveshika Purna": 800,
    "Madhyama Pratham": 1000,
    "Madhyama Purna": 1000,
    "Visharad Pratham": 1200,
    "Visharad Purna": 1200,
    "Alankar Pratham": 1500,
    "Alankar Purna": 1500
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
        type: Number,
        required:true
    },
    exam_level : {
        type: String,
        required:true
    },
    exam_fee: { 
        type: Number, default: function() { return feeStructure[this.exam_level] || 800; } }, // Default 800
    mother_ph_no : {
        type: Number,
        required:true
    },
    father_ph_no : {
        type: Number,
        required:true
    },
    password : {
        type: String,
        required:true
    },
    is_admin : {
        type: Number,
        required:true
    },
    is_verified : {
        type: Number,
        default: 0
    },
    createdAt: {  // Changed from joinDate to createdAt
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String,
        default: "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/o9ojcgon2k7icjmkyghb",
    }
    }, {
    timestamps: true  // This will automatically add createdAt and updatedAt fields
    
});

module.exports = mongoose.model('User', userSchema);



