const teacherService = require('../services/teacherService');

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
        const { studentId } = req.body;
        // Find the student first to verify they exist
        const result = await teacherService.getDeleteStudent(studentId);
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

module.exports = {
    load_trDashboard,
    Teacher_getAllStudents,
    Teacher_deleteStudent,
    uploadMaterial,
    getMaterialsByLevel,
    loadUploadMaterial,
    getAllCategories
}