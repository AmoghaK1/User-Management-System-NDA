const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const mongoose = require('mongoose')


const getAllStudents = async () => {
    try{    
        const students = await User.find({ is_admin: 0 }).select("_id name email");
        return students;
    }
    catch(error){
        console.error("Error fetching students:", error);
        throw error;
    }
};


const getDeleteStudent = async (studentId) => {
    try{
        const student = await User.findById(studentId);
        if (!student) {
            return {
                success: false,
                status: 404,
                error: "Student not found"
            };
        };

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();
            // Delete the student's payment records first
        await PaymentStatus.deleteMany({ userId: studentId },{ session });

        // Finally delete the student
        await User.deleteOne({ _id: studentId } ,  { session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return success response
        return{ 
            success: true, 
            status: 200,
            message: "Student and all related payment records deleted successfully" 
        };
    }catch(error){
        await session.abortTransaction();
        session.endSession();
        console.error("Service error in deleteStudent:", error);
        return {
            success: false,
            message: "Failed to delete student and payment records",
            details: error.message
        }
    }
};

module.exports = {
    getAllStudents,
    getDeleteStudent
};