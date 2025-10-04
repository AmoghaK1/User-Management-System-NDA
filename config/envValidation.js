const REQUIRED_ENV_VARS = [
    { key: 'MONGO_URI', mask: true },
    { key: 'SENDGRID_API_KEY', mask: true },
    { key: 'AUTH_EMAIL', mask: false },
    { key: 'CURRENT_URL', mask: false }
];

const maskValue = (value = '') => {
    if (value.length <= 8) {
        return '*'.repeat(value.length);
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

module.exports = function validateEnvironment() {
    console.log('🔍 Validating required environment variables...');

    const missing = [];

    REQUIRED_ENV_VARS.forEach(({ key, mask }) => {
        const rawValue = process.env[key];
        if (!rawValue) {
            missing.push(key);
            console.warn(`⚠️  Missing environment variable: ${key}`);
        } else {
            const display = mask ? maskValue(rawValue) : rawValue;
            console.log(`✅ ${key} loaded (${mask ? 'masked' : 'visible'}): ${display}`);
        }
    });

    const healthToken = process.env.SENDGRID_HEALTH_TOKEN;
    if (healthToken) {
        console.log(`ℹ️  SENDGRID_HEALTH_TOKEN detected (masked): ${maskValue(healthToken)}`);
    } else {
        console.log('ℹ️  SENDGRID_HEALTH_TOKEN not set. SendGrid HTTP health endpoint will be disabled.');
    }

    if (missing.length) {
        console.error('❌ Environment validation failed. Define the variables above and redeploy.');
    } else {
        console.log('✅ All required environment variables are present.');
    }

    return missing;
};
