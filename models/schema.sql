-- Supabase PostgreSQL Schema for NDA Application
-- Run this SQL in your Supabase SQL Editor to create the tables

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    birthdate DATE NOT NULL,
    age INTEGER NOT NULL,
    student_ph_no VARCHAR(50) NOT NULL,
    exam_level VARCHAR(100) NOT NULL,
    exam_fee INTEGER DEFAULT 800,
    password VARCHAR(255) NOT NULL,
    is_admin INTEGER NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verifiedAt TIMESTAMP,
    google_sub TEXT,
    google_email TEXT,
    profilePicture TEXT DEFAULT 'https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/oi0mzzlbzrjspastm3dl',
    resetPasswordToken TEXT,
    resetPasswordExpires TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Payment Status Table
CREATE TABLE IF NOT EXISTS payment_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    userName VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    months JSONB DEFAULT '{"0":"Pending","1":"Pending","2":"Pending","3":"Pending","4":"Pending","5":"Pending","6":"Pending","7":"Pending","8":"Pending","9":"Pending","10":"Pending","11":"Pending"}',
    quarters JSONB DEFAULT '{"1":"Pending","2":"Pending","3":"Pending","4":"Pending"}',
    halfYearly JSONB DEFAULT '{"half1":"Pending","half2":"Pending"}',
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Study Materials Table
CREATE TABLE IF NOT EXISTS study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('image', 'pdf')),
    url TEXT NOT NULL,
    category VARCHAR(255) NOT NULL,
    level VARCHAR(100) NOT NULL CHECK (level IN (
        'Senior Batch',
        'Prarambhik',
        'Praveshika Pratham',
        'Praveshika Purna',
        'Madhyama Pratham',
        'Madhyama Purna',
        'Visharad Pratham',
        'Visharad Purna',
        'Alankar Pratham',
        'Alankar Purna',
        'TMV-BA'
    )),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- User Verifications Table
CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId VARCHAR(255) NOT NULL,
    uniqueString TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL,
    expiresAt TIMESTAMP NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_exam_level ON users(exam_level);
CREATE INDEX IF NOT EXISTS idx_payment_status_userId ON payment_status(userId);
CREATE INDEX IF NOT EXISTS idx_payment_status_year ON payment_status(year);
CREATE INDEX IF NOT EXISTS idx_study_materials_level ON study_materials(level);
CREATE INDEX IF NOT EXISTS idx_study_materials_category ON study_materials(category);
CREATE INDEX IF NOT EXISTS idx_user_verifications_userId ON user_verifications(userId);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to auto-update updatedAt columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_status_updated_at BEFORE UPDATE ON payment_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_materials_updated_at BEFORE UPDATE ON study_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure Google OAuth columns exist on legacy databases
ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS verifiedAt TIMESTAMP,
    ADD COLUMN IF NOT EXISTS google_sub TEXT,
    ADD COLUMN IF NOT EXISTS google_email TEXT;
