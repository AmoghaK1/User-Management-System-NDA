const express = require('express');
const bodyParser = require('body-parser');
const teacher_route = express();
const config = require("../config/config")
const auth = require('../middlewares/auth');


teacher_route.use(bodyParser.json());
teacher_route.use(bodyParser.urlencoded({extended: true}));

const teacherController = require('../controllers/teacherController');
const userController = require('../controllers/userController');
const passport = require('passport');

teacher_route.get('/tr-dashboard', auth.ensureAuthenticated, teacherController.load_trDashboard);
teacher_route.post('/delete-student',auth.ensureAuthenticated, teacherController.Teacher_deleteStudent);
teacher_route.get('/get-all-students',auth.ensureAuthenticated, teacherController.Teacher_getAllStudents);
teacher_route.get('/teacher-register',auth.ensureAuthenticated, userController.logout_user);

module.exports = teacher_route;