const { getAllStudents} = require('../services/teacherService');
const { getDeleteStudent } = require('../services/teacherService');

const load_trDashboard = async(req,res)=>{
    if(req.user.email !== "rajjii11@gmail.com"){
        return res.redirect('/st-dashboard')
    }
    res.render('teacher-dashboard');
}

const Teacher_getAllStudents = async (req, res) => {
    try {
       const students = await getAllStudents();
       res.json(students); 
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const Teacher_deleteStudent = async (req, res) => {
   
    try {
        const { studentId } = req.body;
        // Find the student first to verify they exist
        const result = await getDeleteStudent(studentId);
        if (!result.success) {
           return res.status(result.status || 400).json({
                success: false,
                error: result.message
            });
        }

         return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error("Controller error in Teacher_deleteStudent:", error);
        return res.status(500).json({
            success: false,
            error: "Unexpected error occurred while deleting student"
        });
    }
};

module.exports = {
    load_trDashboard,
    Teacher_getAllStudents,
    Teacher_deleteStudent
}