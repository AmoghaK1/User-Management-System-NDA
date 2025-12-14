const User = require('../models/userModel');
const UserPG = require('../models/pg/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const mongoose = require('mongoose')
const StudyMaterial = require('../models/studyMaterialModel');
const StudyMaterialDTO = require('../dtos/studyMaterialDTO');


const getAllStudents = async () => {
    try{    
        const students = await UserPG.findAll({ 
            where: { is_admin: 0 },
            attributes: ["id", "name", "email", "exam_level"]
        });
        return students;
    }
    catch(error){
        console.error("Error fetching students:", error);
        throw error;
    }
};


const getDeleteStudent = async (studentId) => {
    try{
        const student = await UserPG.findByPk(studentId);
        if (!student) {
            return {
                success: false,
                status: 404,
                error: "Student not found"
            };
        };

        // Start a session for MongoDB transaction (for payments)
        const session = await mongoose.startSession();
        session.startTransaction();
            // Delete the student's payment records first
        await PaymentStatus.deleteMany({ userId: studentId },{ session });

        // Delete from PostgreSQL
        await student.destroy();

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
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
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
    const student = await UserPG.findByPk(studentId, { raw: true });
    if (!student) return null;
    const currentYear = new Date().getFullYear();
    const payment = await PaymentStatus.findOne({ userId: studentId, year: currentYear }).lean();
    return { student, payment };
};

const getMonthlyFeeCollection = async (year) => {
    try {
        const currentYear = year || new Date().getFullYear();
        console.log(`🔄 Fetching fee collection data for year: ${currentYear} at ${new Date().toLocaleString()}`);
        
        // Get all students with their fee amounts
        const students = await UserPG.findAll({ 
            where: { is_admin: 0 },
            attributes: ['id', 'name', 'exam_fee', 'exam_level'],
            raw: true
        });
        console.log(`📊 Found ${students.length} students in database`);
        
        // Get all payment statuses for the current year (without .lean() to preserve Maps)
        const paymentStatuses = await PaymentStatus.find({ year: currentYear });
        console.log(`💰 Found ${paymentStatuses.length} payment records for year ${currentYear}`);
        
        // Create a map for easy lookup
        const paymentMap = new Map();
        paymentStatuses.forEach(payment => {
            paymentMap.set(payment.userId.toString(), payment);
        });
        
        // Calculate monthly collections
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const monthlyData = [];
        let totalYearCollection = 0;
        let currentMonth = new Date().getMonth();
        let currentMonthCollection = 0;
        let totalPendingAmount = 0;
        
        // Only show months from January to current month (not future months)
        for (let month = 0; month <= currentMonth; month++) {
            let monthlyCollection = 0;
            let studentsCount = 0;
            let paidStudents = 0;
            
            students.forEach(student => {
                // Handle both PostgreSQL (id) and MongoDB (_id)
                const studentId = student.id || student._id;
                const payment = paymentMap.get(studentId.toString());
                const studentFee = parseFloat(student.exam_fee) || 0;
                
                // Handle Map objects properly
                let monthStatus = 'Pending';
                if (payment && payment.months) {
                    monthStatus = payment.months.get(String(month)) || 'Pending';
                }
                
                if (monthStatus === 'Paid') {
                    monthlyCollection += studentFee;
                    paidStudents++;
                }
                studentsCount++;
                
                // Calculate pending for current month and future months
                if (month >= currentMonth && monthStatus !== 'Paid') {
                    totalPendingAmount += studentFee;
                }
            });
            
            totalYearCollection += monthlyCollection;
            
            if (month === currentMonth) {
                currentMonthCollection = monthlyCollection;
            }
            
            monthlyData.push({
                month: monthNames[month],
                monthIndex: month,
                collection: monthlyCollection,
                totalStudents: studentsCount,
                paidStudents: paidStudents,
                pendingStudents: studentsCount - paidStudents,
                collectionPercentage: studentsCount > 0 ? Math.round((paidStudents / studentsCount) * 100) : 0
            });
        }
        
        // Debug: Log the order of months being returned
        console.log(`📅 Month order generated:`, monthlyData.map(m => `${m.monthIndex}-${m.month}`).join(', '));
        
        console.log(`✅ Calculated fee collection data - Total: ₹${totalYearCollection}, Current Month: ₹${currentMonthCollection}, Pending: ₹${totalPendingAmount}`);
        
        return {
            year: currentYear,
            monthlyData,
            summary: {
                totalYearCollection,
                currentMonthCollection,
                totalPendingAmount,
                totalStudents: students.length,
                averageMonthlyCollection: totalYearCollection / 12
            }
        };
        
    } catch (error) {
        console.error("❌ Error calculating monthly fee collection:", error);
        throw error;
    }
};

module.exports = {
    getAllStudents,
    getDeleteStudent,
    saveMaterial,
    getMaterials,
    getAllUniqueCategories,
    deleteMaterial,
    getStudentDetailsWithPayment,
    getMonthlyFeeCollection,
};