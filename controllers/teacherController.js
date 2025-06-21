const teacherService = require('../services/teacherService');
const { getAllStudents} = require('../services/teacherService');
const PaymentStatus = require('../models/paymentModel');

const load_trDashboard = async(req,res)=>{
    if(req.user.email !== "rajjii11@gmail.com"){
        return res.redirect('/st-dashboard')
    }
    res.render('teacher-dashboard');
}

const loadUploadMaterial = (req, res) => {
  res.render('studyMaterialPage'); 
};

const Teacher_getAllStudents = async (req, res) => {
    try {
       const students = await teacherService.getAllStudents();
       res.json(students); 
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const Teacher_deleteStudent = async (req, res) => {
   
    try {
        const studentId = req.params.id;
        // Find the student first to verify they exist
        const result = await teacherService.getDeleteStudent(studentId);
        if (!result.success) {
           return res.status(result.status || 400).json({
                success: false,
                error: result.message
            });
        }

        req.flash('success', 'Student deleted successfully');
        return res.redirect('/student_database');
    } catch (error) {
        console.error("Controller error in Teacher_deleteStudent:", error);
        return res.status(500).json({
            success: false,
            error: "Unexpected error occurred while deleting student"
        });
    }
};

const uploadMaterial = async (req, res) => {
  try {
    const { title, category, level } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Determine file type
    const type = file.mimetype.startsWith('image')
      ? 'image'
      : file.mimetype === 'application/pdf'
        ? 'pdf'
        : 'unknown';

    if (type === 'unknown') {
      return res.status(400).json({ message: 'Only images and PDFs are allowed' });
    }

    const materialDTO = await teacherService.saveMaterial({
      title,
      url: file.path,
      type,
      category,
      level
    });

    res.status(201).json({
      message: 'Study material uploaded successfully',
      data: materialDTO
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMaterialsByLevel = async (req, res) => {
  try {
    const { level } = req.query;

    const materials = await teacherService.getMaterials(level);

    res.status(200).json({
      message: 'Materials fetched successfully',
      count: materials.length,
      data: materials
    });

  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await teacherService.getAllUniqueCategories();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const result = await teacherService.deleteMaterial(materialId);
    
    if (!result.success) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("Controller error in deleteMaterial:", error);
    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred while deleting material"
    });
  }
};

const loadStudentDatabaseMain = async (req, res) => {
    try {
        const students = await getAllStudents();
        res.render('student_database_main', { students });
    } catch (error) {
        console.error('Error loading student database:', error);
        res.status(500).send('Internal Server Error');
    }
};

const loadStudentDbDetails = async (req, res) => {
    try {
        const studentId = req.params.id;
        const details = await teacherService.getStudentDetailsWithPayment(studentId);
        if (!details || !details.student) {
            req.flash('error', 'Student not found');
            return res.redirect('/student_database');
        }
        res.render('student_db_details', { student: details.student, payment: details.payment });
    } catch (error) {
        console.error('Error loading student details:', error);
        req.flash('error', 'Could not load student details');
        res.redirect('/student_database');
    }
};

const loadUpdateFee = (req, res) => {
    const { studentId, year, month, quarter, isQuarterly } = req.query;
    res.render('stdb_update_fees', {
        studentId,
        year,
        month,
        quarter,
        isQuarterly
    });
}

const updateStudentFee = async (req, res) => {
    const { id } = req.params;
    const { year, month, quarter, isQuarterly, amount, paymentType } = req.body;
    try {
        let paymentStatus = await PaymentStatus.findOne({ userId: id, year });
        if (!paymentStatus) paymentStatus = new PaymentStatus({ userId: id, year });
        if (isQuarterly === 'true') {
            paymentStatus.quarters.set(String(quarter), 'Paid');
            const startMonth = (quarter - 1) * 3;
            for (let i = startMonth; i < startMonth + 3; i++) {
                paymentStatus.months.set(String(i), 'Paid');
            }
        } else {
            paymentStatus.months.set(String(month), 'Paid');
        }
        // Optionally, you can store amount/paymentType in a separate array or object
        await paymentStatus.save();
        // Redirect to student details page after update
        res.redirect(`/student-db-details/${id}`);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    load_trDashboard,
    Teacher_getAllStudents,
    Teacher_deleteStudent,
    uploadMaterial,
    getMaterialsByLevel,
    loadUploadMaterial,
    getAllCategories,
    deleteMaterial,
    loadStudentDatabaseMain,
    loadStudentDbDetails,
    loadUpdateFee,
    updateStudentFee
}