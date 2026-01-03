const teacherService = require('../services/teacherService');
const { getAllStudents} = require('../services/teacherService');
const PaymentStatus = require('../models/paymentModel');
const feeCollectionEvents = require('../services/feeCollectionEvents');

const load_trDashboard = async(req,res)=>{
    if(req.user.email !== "rajjii11@gmail.com"){
        return res.redirect('/st-dashboard')
    }
    res.render('teacher/teacher-dashboard');
}

const loadUploadMaterial = (req, res) => {
  res.render('teacher/studyMaterialPage'); 
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

    console.log('Upload request received:', {
      title,
      category,
      level,
      file: file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      } : 'No file'
    });

    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Determine file type
    const type = file.mimetype.startsWith('image')
      ? 'image'
      : file.mimetype === 'application/pdf'
        ? 'pdf'
        : 'unknown';

    console.log('Determined file type:', type);

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

    console.log('Material saved successfully:', materialDTO);

    res.status(201).json({
      message: 'Study material uploaded successfully',
      data: materialDTO
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
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
        res.render('teacher/student_database_main', { students });
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
        res.render('teacher/student_db_details', { student: details.student, payment: details.payment });
    } catch (error) {
        console.error('Error loading student details:', error);
        req.flash('error', 'Could not load student details');
        res.redirect('/student_database');
    }
};

const loadUpdateFee = (req, res) => {
    const { studentId, year, month, quarter, isQuarterly, halfId, isHalfYearly } = req.query;
    res.render('teacher/stdb_update_fees', {
        studentId,
        year,
        month,
        quarter,
        isQuarterly,
        halfId,
        isHalfYearly
    });
}

const updateStudentFee = async (req, res) => {
    const { id } = req.params;
    const { year, month, quarter, isQuarterly, halfId, isHalfYearly, amount, paymentType } = req.body;
    try {
        let paymentStatus = await PaymentStatus.findOne({ userid: id, year });
        
        if (!paymentStatus) {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            
            const defaultMonths = {};
            for (let i = 0; i < 12; i++) {
                defaultMonths[i] = 'Pending';
            }
            const defaultQuarters = { 1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending' };
            const defaultHalfYearly = { 'half1': 'Pending', 'half2': 'Pending' };
            
            paymentStatus = await PaymentStatus.create({ 
                userid: id, 
                username: user.name, 
                year,
                months: defaultMonths,
                quarters: defaultQuarters,
                halfyearly: defaultHalfYearly
            });
        }
        
        // Clone the JSONB objects to modify them
        const months = { ...paymentStatus.months };
        const quarters = { ...paymentStatus.quarters };
        const halfyearly = { ...paymentStatus.halfyearly };
        
        if (isHalfYearly === 'true') {
            // Handle half-yearly payment
            halfyearly[halfId] = 'Paid';
            // Update individual months (0-5 for half1, 6-11 for half2)
            const startMonth = halfId === 'half1' ? 0 : 6;
            for (let i = startMonth; i < startMonth + 6; i++) {
                months[String(i)] = 'Paid';
            }
        } else if (isQuarterly === 'true') {
            quarters[String(quarter)] = 'Paid';
            const startMonth = (quarter - 1) * 3;
            for (let i = startMonth; i < startMonth + 3; i++) {
                months[String(i)] = 'Paid';
            }
        } else {
            months[String(month)] = 'Paid';
        }
        
        // Update in database
        await PaymentStatus.updateById(paymentStatus.id, {
            months,
            quarters,
            halfyearly
        });

        // Emit real-time event for fee collection update
        feeCollectionEvents.notifyPaymentUpdate({
            userId: id,
            year,
            month,
            quarter,
            isQuarterly,
            halfId,
            isHalfYearly
        });

        console.log(`💰 Manual fee update - Student: ${id}, Year: ${year}, Month: ${month}, Quarter: ${quarter}, Quarterly: ${isQuarterly}, HalfId: ${halfId}, HalfYearly: ${isHalfYearly}`);

        // Redirect to student details page after update
        res.redirect(`/student-db-details/${id}`);
    } catch (err) {
        console.error('Error updating student fee:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getFeeCollectionData = async (req, res) => {
    try {
        const { year } = req.query;
        const collectionData = await teacherService.getMonthlyFeeCollection(year);
        
        res.status(200).json({
            success: true,
            data: collectionData
        });
    } catch (error) {
        console.error("Error fetching fee collection data:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch fee collection data"
        });
    }
};

const getFeeCollectionSSE = (req, res) => {
    // Set up Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Real-time fee collection updates connected',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Add client to the event emitter
    feeCollectionEvents.addClient(res);

    // Handle client disconnect
    req.on('close', () => {
        console.log('📡 SSE client disconnected');
    });
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
    updateStudentFee,
    getFeeCollectionData,
    getFeeCollectionSSE
}