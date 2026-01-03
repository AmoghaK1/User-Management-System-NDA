const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const StudyMaterial = require('../models/studyMaterialModel');
const StudyMaterialDTO = require('../dtos/studyMaterialDTO');


const getAllStudents = async () => {
    try{    
        const students = await User.find({ is_admin: 0 });
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

        // Delete the student's payment records first
        const paymentRecords = await PaymentStatus.find({ userid: studentId });
        for (const payment of paymentRecords) {
            await PaymentStatus.deleteById(payment.id);
        }

        // Finally delete the student
        await User.deleteById(studentId);

        // Return success response
        return{ 
            success: true, 
            status: 200,
            message: "Student and all related payment records deleted successfully" 
        };
    }catch(error){
        console.error("Service error in deleteStudent:", error);
        return {
            success: false,
            message: "Failed to delete student and payment records",
            details: error.message
        }
    }
};

const saveMaterial = async ({ title, url, type, category, level }) => {
  const saved = await StudyMaterial.create({
    title,
    url,
    type,
    category,
    level
  });
  return new StudyMaterialDTO(saved);
};

const getMaterials = async (level) => {
  const query = level ? { level } : {};
  const materials = await StudyMaterial.find(query);
  // Sort manually in JavaScript
  materials.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return new Date(b.createdat) - new Date(a.createdat);
  });

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

    await StudyMaterial.deleteById(materialId);
    
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
    const student = await User.findById(studentId);
    if (!student) return null;
    const currentYear = new Date().getFullYear();
    const payment = await PaymentStatus.findOne({ userid: studentId, year: currentYear });
    return { student, payment };
};

const getMonthlyFeeCollection = async (year) => {
    try {
        const currentYear = year || new Date().getFullYear();
        console.log(`🔄 Fetching fee collection data for year: ${currentYear} at ${new Date().toLocaleString()}`);
        
        // Get all students with their fee amounts
        const students = await User.find({ is_admin: 0 });
        console.log(`📊 Found ${students.length} students in database`);
        
        // Get all payment statuses for the current year
        const paymentStatuses = await PaymentStatus.find({ year: currentYear });
        console.log(`💰 Found ${paymentStatuses.length} payment records for year ${currentYear}`);
        
        // Create a map for easy lookup
        const paymentMap = new Map();
        paymentStatuses.forEach(payment => {
            paymentMap.set(payment.userid, payment);
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
                const payment = paymentMap.get(student.id);
                const studentFee = parseFloat(student.exam_fee) || 0;
                
                // Handle JSONB months object from PostgreSQL
                let monthStatus = 'Pending';
                if (payment && payment.months) {
                    monthStatus = payment.months[String(month)] || 'Pending';
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