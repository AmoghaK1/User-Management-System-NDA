const MonthFeeSettings = require('../models/monthFeeSettingsModel');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const ALLOWED_MODES = ['full', 'half', 'skip'];
const MODE_FACTORS = {
    full: 1,
    half: 0.5,
    skip: 0
};

function buildDefaultSettings() {
    return {
        modes: [...ALLOWED_MODES],
        months: MONTH_NAMES.map((name, index) => ({ index, name, mode: 'full' }))
    };
}

async function getMonthFeeSettings(year = null) {
    try {
        const targetYear = year || new Date().getFullYear();
        const record = await MonthFeeSettings.findByYear(targetYear);

        if (!record) {
            // Auto-create default settings for this year if not found
            const defaults = buildDefaultSettings();
            const created = await MonthFeeSettings.create(targetYear, defaults.months);
            return {
                modes: [...ALLOWED_MODES],
                months: created.months || defaults.months,
                year: targetYear
            };
        }

        return {
            modes: [...ALLOWED_MODES],
            months: Array.isArray(record.months) ? record.months : buildDefaultSettings().months,
            year: targetYear
        };
    } catch (error) {
        console.error('Error fetching month fee settings from database:', error);
        const defaults = buildDefaultSettings();
        return { ...defaults, year: year || new Date().getFullYear() };
    }
}

async function updateMonthFeeSettings(year = null, newMonthModes = {}) {
    try {
        const targetYear = year || new Date().getFullYear();
        const current = await getMonthFeeSettings(targetYear);
        
        const updatedMonths = current.months.map((month) => {
            const incomingMode = newMonthModes[String(month.index)] || newMonthModes[month.index];
            const safeMode = ALLOWED_MODES.includes(incomingMode) ? incomingMode : month.mode;
            return {
                ...month,
                mode: safeMode
            };
        });

        const updated = await MonthFeeSettings.upsertByYear(targetYear, updatedMonths);
        return {
            modes: [...ALLOWED_MODES],
            months: updated.months || updatedMonths,
            year: targetYear
        };
    } catch (error) {
        console.error('Error updating month fee settings in database:', error);
        throw error;
    }
}

async function listMonthFeeSettingYears() {
    try {
        const years = await MonthFeeSettings.findAll();
        return years;
    } catch (error) {
        console.error('Error listing month fee setting years:', error);
        return [new Date().getFullYear()];
    }
}


function getMonthFactor(settings, monthIndex) {
    const fallback = 1;
    if (!settings || !Array.isArray(settings.months)) {
        return fallback;
    }

    const monthEntry = settings.months.find((month) => month.index === monthIndex);
    if (!monthEntry || !Object.prototype.hasOwnProperty.call(MODE_FACTORS, monthEntry.mode)) {
        return fallback;
    }

    return MODE_FACTORS[monthEntry.mode];
}

function getQuarterMonthIndices(quarter) {
    const quarterNum = parseInt(quarter, 10);
    if (Number.isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
        return [];
    }
    const startMonth = (quarterNum - 1) * 3;
    return [startMonth, startMonth + 1, startMonth + 2];
}

function getHalfYearMonthIndices(halfId) {
    if (halfId === 'half1') {
        return [0, 1, 2, 3, 4, 5];
    }
    if (halfId === 'half2') {
        return [6, 7, 8, 9, 10, 11];
    }
    return [];
}

function calculateAmountForMonths(monthlyFee, monthIndices, settings) {
    const safeMonthlyFee = Number(monthlyFee) || 0;
    return monthIndices.reduce((sum, monthIndex) => {
        return sum + (safeMonthlyFee * getMonthFactor(settings, monthIndex));
    }, 0);
}

module.exports = {
    ALLOWED_MODES,
    MONTH_NAMES,
    getMonthFeeSettings,
    updateMonthFeeSettings,
    listMonthFeeSettingYears,
    getQuarterMonthIndices,
    getHalfYearMonthIndices,
    calculateAmountForMonths
};