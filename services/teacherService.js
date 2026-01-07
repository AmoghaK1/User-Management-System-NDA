const User = require('../models/userModel');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const StudyMaterial = require('../models/studyMaterialModel');
const StudyMaterialDTO = require('../dtos/studyMaterialDTO');

const LATEST_FEE_STRUCTURE = {
    "Senior Batch": 1100,
    "Prarambhik": 900,
    "Praveshika Pratham": 900,
    "Praveshika Purna": 1000,
    "Madhyama Pratham": 1000,
    "Madhyama Purna": 1000,
    "Visharad Pratham": 1200,
    "Visharad Purna": 1200,
    "Alankar Pratham": 1500,
    "Alankar Purna": 1500,
    "TMV-BA": 1200
};

const QUARTER_DEFINITIONS = [
    { index: 1, label: 'Q1 (Jan-Mar)', months: [0, 1, 2] },
    { index: 2, label: 'Q2 (Apr-Jun)', months: [3, 4, 5] },
    { index: 3, label: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
    { index: 4, label: 'Q4 (Oct-Dec)', months: [9, 10, 11] }
];

const getEffectiveMonthlyFee = (student) => {
    const structuredFee = LATEST_FEE_STRUCTURE[student.exam_level];
    if (structuredFee) {
        return structuredFee;
    }
    const storedFee = parseFloat(student.exam_fee);
    return Number.isFinite(storedFee) ? storedFee : 0;
};

const isQuarterPaid = (payment, quarterDef) => {
    if (!payment) {
        return false;
    }

    const { index, months } = quarterDef;
    const quarterKey = String(index);

    if (payment.quarters && payment.quarters[quarterKey] === 'Paid') {
        return true;
    }

    if (payment.months) {
        return months.every(monthIndex => payment.months[String(monthIndex)] === 'Paid');
    }

    return false;
};


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

const getStudentDetailsWithPayment = async (studentId, year) => {
    const student = await User.findById(studentId);
    if (!student) return null;

    const paymentRecords = await PaymentStatus.find({ userid: studentId });
    let availableYears = Array.from(new Set(paymentRecords.map(record => record.year))).filter(Boolean);
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(year, 10) || currentYear;

    let payment = paymentRecords.find(record => record.year === selectedYear);

    if (!payment && selectedYear === currentYear) {
        payment = await PaymentStatus.create({
            userid: studentId,
            username: student.name,
            year: currentYear
        });
        availableYears.push(currentYear);
    }

    if (!availableYears.includes(currentYear)) {
        availableYears.push(currentYear);
    }

    availableYears = Array.from(new Set(availableYears)).filter(Boolean).sort((a, b) => b - a);

    return { student, payment, availableYears, selectedYear };
};

const getQuarterlyFeeCollection = async (year) => {
    try {
        const now = new Date();
        const requestedYear = parseInt(year, 10) || now.getFullYear();
        
        const students = await User.find({ is_admin: 0 });
        
        const paymentStatuses = await PaymentStatus.find({ year: requestedYear });
        
        let availableYears = await PaymentStatus.listYears();
        if (!availableYears.includes(requestedYear)) {
            availableYears.push(requestedYear);
        }
        availableYears = availableYears.filter(Boolean).sort((a, b) => b - a);
        
        const paymentMap = new Map();
        paymentStatuses.forEach(payment => {
            paymentMap.set(payment.userid, payment);
        });
        const quarterlyData = [];
        let totalYearCollection = 0;
        const isCurrentYear = requestedYear === now.getFullYear();
        let currentQuarterIndex = isCurrentYear ? Math.floor(now.getMonth() / 3) : 3;
        let currentQuarterCollection = 0;
        let totalPendingAmount = 0;

        let maxQuarterToShow = isCurrentYear ? currentQuarterIndex + 1 : 4; // quarters are 1-indexed
        paymentStatuses.forEach(payment => {
            QUARTER_DEFINITIONS.forEach(def => {
                if (isQuarterPaid(payment, def) && def.index > maxQuarterToShow) {
                    maxQuarterToShow = def.index;
                }
            });
        });

        QUARTER_DEFINITIONS.forEach(def => {
            let quarterCollection = 0;
            let paidStudents = 0;
            let pendingAmountForQuarter = 0;

            students.forEach(student => {
                const payment = paymentMap.get(student.id);
                const monthlyFee = getEffectiveMonthlyFee(student);
                const quarterFee = monthlyFee * def.months.length;
                const quarterPaid = isQuarterPaid(payment, def);

                if (quarterPaid) {
                    quarterCollection += quarterFee;
                    paidStudents++;
                } else {
                    pendingAmountForQuarter += quarterFee;
                }
            });

            const entry = {
                quarter: def.label,
                quarterIndex: def.index,
                collection: quarterCollection,
                totalStudents: students.length,
                paidStudents,
                pendingStudents: students.length - paidStudents,
                collectionPercentage: students.length > 0 ? Math.round((paidStudents / students.length) * 100) : 0
            };

            if (def.index <= maxQuarterToShow) {
                totalPendingAmount += pendingAmountForQuarter;
                totalYearCollection += quarterCollection;
                quarterlyData.push(entry);
            }

            const targetQuarterIndex = isCurrentYear ? currentQuarterIndex : 3;
            if (def.index - 1 === targetQuarterIndex) {
                currentQuarterCollection = quarterCollection;
            }
        });

        const quartersIncluded = quarterlyData.length;

        return {
            year: requestedYear,
            availableYears,
            quarterlyData,
            summary: {
                totalYearCollection,
                currentQuarterCollection,
                totalPendingAmount,
                totalStudents: students.length,
                averageQuarterlyCollection: quartersIncluded > 0 ? totalYearCollection / quartersIncluded : 0
            }
        };
        
    } catch (error) {
        console.error("❌ Error calculating quarterly fee collection:", error);
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
    getQuarterlyFeeCollection,
};