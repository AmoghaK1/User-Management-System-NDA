-- Create month_fee_settings table for storing monthly fee configuration per year
-- This table stores which months have full, half, or skip fee collection

CREATE TABLE IF NOT EXISTS month_fee_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  year INT NOT NULL,
  months JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year)
);

-- Add index for faster lookups by year
CREATE INDEX IF NOT EXISTS idx_month_fee_settings_year ON month_fee_settings(year);

-- Enable Row Level Security (optional - adjust based on your auth model)
ALTER TABLE month_fee_settings ENABLE ROW LEVEL SECURITY;

-- Allow teacher (authenticated users) to read/write month fee settings
CREATE POLICY "Teachers can read month fee settings" 
  ON month_fee_settings FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can update month fee settings" 
  ON month_fee_settings FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can insert month fee settings" 
  ON month_fee_settings FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_month_fee_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_month_fee_settings_timestamp ON month_fee_settings;
CREATE TRIGGER trigger_update_month_fee_settings_timestamp
  BEFORE UPDATE ON month_fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_month_fee_settings_timestamp();
