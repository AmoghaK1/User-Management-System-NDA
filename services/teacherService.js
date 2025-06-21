const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const mongoose = require('mongoose')
const StudyMaterial = require('../models/studyMaterialModel');
const StudyMaterialDTO = require('../dtos/studyMaterialDTO');


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

const saveMaterial = async ({ title, url, type, category, level }) => {
  const newMaterial = new StudyMaterial({
    title,
    url,
    type,
    category,
    level
  });

  const saved = await newMaterial.save();
  return new StudyMaterialDTO(saved);
};

const getMaterials = async (level) => {
  const query = level ? { level } : {};
  const materials = await StudyMaterial.find(query).sort({ category: 1, createdAt: -1 });

  return materials.map((mat) => new StudyMaterialDTO(mat));
};

const getAllUniqueCategories = async () => {
  const categories = await StudyMaterial.distinct('category');
  return categories;
};

const deleteMaterial = async (materialId) => {
  try {
    const material = await StudyMaterial.findById(materialId);
    if (!material) {
      return {
        success: false,
        status: 404,
        message: "Study material not found"
      };
    }

    await StudyMaterial.deleteOne({ _id: materialId });
    
    return {
      success: true,
      status: 200,
      message: "Study material deleted successfully"
    };
  } catch (error) {
    console.error("Service error in deleteMaterial:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to delete study material",
      details: error.message
    };
  }
};

const getStudentDetailsWithPayment = async (studentId) => {
    const student = await User.findById(studentId).lean();
    if (!student) return null;
    const currentYear = new Date().getFullYear();
    const payment = await PaymentStatus.findOne({ userId: studentId, year: currentYear }).lean();
    return { student, payment };
};

module.exports = {
    getAllStudents,
    getDeleteStudent,
    saveMaterial,
    getMaterials,
    getAllUniqueCategories,
    deleteMaterial,
    getStudentDetailsWithPayment,
};