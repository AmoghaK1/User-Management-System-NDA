const express = require('express');
const bodyParser = require('body-parser');
const teacher_route = express();
const config = require("../config/config")
const auth = require('../middlewares/auth');


teacher_route.use(bodyParser.json());
teacher_route.use(bodyParser.urlencoded({extended: true}));

const teacherController = require('../controllers/teacherController');
const loginController = require('../controllers/loginController');
const { studyMaterialUpload } = require('../config/studyMaterial');
const passport = require('passport');

teacher_route.get('/tr-dashboard', auth.ensureAuthenticated, teacherController.load_trDashboard);
teacher_route.get('/student_database',auth.ensureAuthenticated, teacherController.loadStudentDatabaseMain);

teacher_route.get('/student-db-details/:id', auth.ensureAuthenticated, teacherController.loadStudentDbDetails);

teacher_route.get('/update-fee', auth.ensureAuthenticated, teacherController.loadUpdateFee);
teacher_route.get('/get-all-students',auth.ensureAuthenticated, teacherController.Teacher_getAllStudents);
teacher_route.get('/teacher-register',auth.ensureAuthenticated, loginController.loadRegister);

teacher_route.get('/material/upload', auth.ensureAuthenticated, teacherController.loadUploadMaterial);

// Upload study material (PDF/Image)
teacher_route.post('/material/upload', auth.ensureAuthenticated, studyMaterialUpload.single('file'), teacherController.uploadMaterial);

// Fetch study materials filtered by level (optional ?level=Prarambhik)
teacher_route.get('/material/fetch', auth.ensureAuthenticated, teacherController.getMaterialsByLevel);

teacher_route.get('/material/categories', auth.ensureAuthenticated, teacherController.getAllCategories);

// Delete study material
teacher_route.delete('/material/delete/:materialId', auth.ensureAuthenticated, teacherController.deleteMaterial);
teacher_route.delete('/students/:id', auth.ensureAuthenticated, teacherController.Teacher_deleteStudent);

// Update student fee status (month/quarter paid)
teacher_route.post('/student-db-details/:id/update-fee', auth.ensureAuthenticated, teacherController.updateStudentFee);

// Get fee collection data
teacher_route.get('/fee-collection-data', auth.ensureAuthenticated, teacherController.getFeeCollectionData);

// Server-Sent Events for real-time fee collection updates
teacher_route.get('/fee-collection-sse', auth.ensureAuthenticated, teacherController.getFeeCollectionSSE);

// Test page for fee collection data (remove in production)
teacher_route.get('/fee-test', auth.ensureAuthenticated, (req, res) => {
    res.render('misc/fee-test');
});


module.exports = teacher_route;