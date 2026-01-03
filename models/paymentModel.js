const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class PaymentStatus {
    static tableName = 'payment_status';

    static async create(paymentData) {
        // Initialize default months (0-11 as Pending)
        const defaultMonths = {};
        for (let i = 0; i < 12; i++) {
            defaultMonths[i] = 'Pending';
        }

        // Initialize default quarters (1-4 as Pending)
        const defaultQuarters = {};
        for (let i = 1; i <= 4; i++) {
            defaultQuarters[i] = 'Pending';
        }

        // Initialize default half yearly
        const defaultHalfYearly = {
            'half1': 'Pending',
            'half2': 'Pending'
        };

        const { data, error } = await supabase
            .from(this.tableName)
            .insert([{
                userid: paymentData.userid,
                username: paymentData.username,
                year: paymentData.year,
                months: paymentData.months || defaultMonths,
                quarters: paymentData.quarters || defaultQuarters,
                halfyearly: paymentData.halfyearly || defaultHalfYearly
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async findById(id) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async findOne(query) {
        let queryBuilder = supabase.from(this.tableName).select('*');
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async find(query = {}) {
        let queryBuilder = supabase.from(this.tableName).select('*');
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data;
    }

    static async updateById(id, updateData) {
        const { data, error } = await supabase
            .from(this.tableName)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateOne(query, updateData) {
        let queryBuilder = supabase.from(this.tableName).update(updateData);
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder.select().single();
        if (error) throw error;
        return data;
    }

    static async deleteById(id) {
        const { data, error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteOne(query) {
        let queryBuilder = supabase.from(this.tableName).delete();
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder.select().single();
        if (error) throw error;
        return data;
    }

    static async count(query = {}) {
        let queryBuilder = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { count, error } = await queryBuilder;
        if (error) throw error;
        return count;
    }
}

module.exports = PaymentStatus;