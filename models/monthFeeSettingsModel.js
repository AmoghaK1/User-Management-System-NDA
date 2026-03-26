const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const ALLOWED_MODES = ['full', 'half', 'skip'];

function buildDefaultMonths() {
    return MONTH_NAMES.map((name, index) => ({ index, name, mode: 'full' }));
}

class MonthFeeSettings {
    static tableName = 'month_fee_settings';

    static async create(year, monthsData = null) {
        const months = monthsData || buildDefaultMonths();

        const { data, error } = await supabase
            .from(this.tableName)
            .insert([{
                year,
                months: months
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async findByYear(year) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('year', year)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    }

    static async findAll() {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('year')
            .order('year', { ascending: false });

        if (error) throw error;
        return (data || []).map(record => record.year);
    }

    static async updateByYear(year, months) {
        const normalized = (months || []).map((month) => {
            const safeMode = ALLOWED_MODES.includes(month.mode) ? month.mode : 'full';
            return { ...month, mode: safeMode };
        });

        const { data, error } = await supabase
            .from(this.tableName)
            .update({ months: normalized })
            .eq('year', year)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async upsertByYear(year, months) {
        const normalized = (months || []).map((month) => {
            const safeMode = ALLOWED_MODES.includes(month.mode) ? month.mode : 'full';
            return { ...month, mode: safeMode };
        });

        const existing = await this.findByYear(year);

        if (existing) {
            return await this.updateByYear(year, normalized);
        } else {
            return await this.create(year, normalized);
        }
    }

    static async deleteByYear(year) {
        const { data, error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('year', year)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = MonthFeeSettings;
