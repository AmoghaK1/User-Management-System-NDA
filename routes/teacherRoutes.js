const express = require('express');
const bodyParser = require('body-parser');
const teacher_route = express();
const config = require("../config/config")
const auth = require('../middlewares/auth');


teacher_route.use(bodyParser.json());
teacher_route.use(bodyParser.urlencoded({extended: true}));

const teacherController = require('../controllers/teacherController');
const userController = require('../controllers/studentController');
const { studyMaterialUpload } = require('../config/studyMaterial');
const passport = require('passport');

teacher_route.get('/tr-dashboard', auth.ensureAuthenticated, teacherController.load_trDashboard);
teacher_route.post('/delete-student',auth.ensureAuthenticated, teacherController.Teacher_deleteStudent);
teacher_route.get('/get-all-students',auth.ensureAuthenticated, teacherController.Teacher_getAllStudents);
teacher_route.get('/teacher-register',auth.ensureAuthenticated, userController.logout_user);

teacher_route.get('/material/upload', auth.ensureAuthenticated, teacherController.loadUploadMaterial);

// Upload study material (PDF/Image)
teacher_route.post('/material/upload', auth.ensureAuthenticated, studyMaterialUpload.single('file'), teacherController.uploadMaterial);

// Fetch study materials filtered by level (optional ?level=Prarambhik)
teacher_route.get('/material/fetch', auth.ensureAuthenticated, teacherController.getMaterialsByLevel);

teacher_route.get('/material/categories', auth.ensureAuthenticated, teacherController.getAllCategories);

// Delete study material
teacher_route.delete('/material/delete/:materialId', auth.ensureAuthenticated, teacherController.deleteMaterial);

module.exports = teacher_route;