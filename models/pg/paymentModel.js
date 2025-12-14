const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const UserPG = require('./userModel');

const PaymentStatusPG = sequelize.define('PaymentStatus', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: UserPG,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    months: {
        type: DataTypes.JSONB,
        defaultValue: {
            "0": "Pending",
            "1": "Pending",
            "2": "Pending",
            "3": "Pending",
            "4": "Pending",
            "5": "Pending",
            "6": "Pending",
            "7": "Pending",
            "8": "Pending",
            "9": "Pending",
            "10": "Pending",
            "11": "Pending"
        }
    },
    quarters: {
        type: DataTypes.JSONB,
        defaultValue: {
            "1": "Pending",
            "2": "Pending",
            "3": "Pending",
            "4": "Pending"
        }
    }
}, {
    tableName: 'payment_status',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'year']
        }
    ]
});

// Define association
PaymentStatusPG.belongsTo(UserPG, { foreignKey: 'userId', as: 'user' });

module.exports = PaymentStatusPG;
