const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');

const load_trDashboard = async(req,res)=>{
    if(req.user.email !== "rajjii11@gmail.com"){
        return res.redirect('/st-dashboard')
    }
    res.render('teacher-dashboard');
}


const Teacher_getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ is_admin: 0 }).select("_id name email");
        res.json(students);
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const Teacher_deleteStudent = async (req, res) => {
    const { studentId } = req.body;
    try {
        // Find the student first to verify they exist
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, error: "Student not found" });
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Delete the student's payment records first
            await PaymentStatus.deleteMany(
                { userId: studentId },
                { session }
            );

            // Finally delete the student
            await User.deleteOne(
                { _id: studentId },
                { session }
            );

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Return success response
            return res.status(200).json({ 
                success: true, 
                message: "Student and all related payment records deleted successfully" 
            });
        } catch (error) {
            // If anything fails, abort the transaction
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Error deleting student:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to delete student and payment records",
            details: error.message
        });
    }
};

module.exports = {
    load_trDashboard,
    Teacher_getAllStudents,
    Teacher_deleteStudent
}