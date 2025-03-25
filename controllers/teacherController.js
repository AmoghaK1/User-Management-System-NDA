const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');

const load_trDashboard = async(req,res)=>{
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
        // Delete the student from the User collection using deleteOne with a specific write concern
        const studentDeletion = await User.deleteOne(
            { _id: studentId },
            { writeConcern: { w: 1 } } // Using w: 1 instead of majority
        );
        
        if (studentDeletion.deletedCount === 0) {
            return res.status(404).json({ success: false, error: "Student not found" });
        }

        // Delete associated payment records with the same write concern
        await PaymentStatus.deleteMany(
            { userId: studentId },
            { writeConcern: { w: 1 } }
        );

        // Return success response
        res.status(200).json({ success: true, message: "Student deleted successfully" });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

module.exports = {
    load_trDashboard,
    Teacher_getAllStudents,
    Teacher_deleteStudent
}