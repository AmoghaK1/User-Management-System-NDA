const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const feeStructure = {
    "Senior Batch": 1000,
    "Prarambhik": 800,
    "Praveshika Pratham": 800,
    "Praveshika Purna": 800,
    "Madhyama Pratham": 1000,
    "Madhyama Purna": 1000,
    "Visharad Pratham": 1200,
    "Visharad Purna": 1200,
    "Alankar Pratham": 1500,
    "Alankar Purna": 1500
};

const UserPG = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    birthdate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    student_ph_no: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    exam_level: {
        type: DataTypes.STRING,
        allowNull: false
    },
    exam_fee: {
        type: DataTypes.INTEGER,
        defaultValue: 800,
        get() {
            const examLevel = this.getDataValue('exam_level');
            return feeStructure[examLevel] || 800;
        }
    },
    mother_ph_no: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    father_ph_no: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is_admin: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    profilePicture: {
        type: DataTypes.STRING,
        defaultValue: "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/oi0mzzlbzrjspastm3dl"
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'users',
    timestamps: true, // This adds createdAt and updatedAt automatically
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ]
});

module.exports = UserPG;
