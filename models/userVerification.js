const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class UserVerification {
    static tableName = 'user_verifications';

    static async create(verificationData) {
        const { data, error } = await supabase
            .from(this.tableName)
            .insert([{
                userid: verificationData.userid,
                uniquestring: verificationData.uniquestring,
                createdat: verificationData.createdat || new Date().toISOString(),
                expiresat: verificationData.expiresat
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

    static async deleteMany(query) {
        let queryBuilder = supabase.from(this.tableName).delete();
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder.select();
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

module.exports = UserVerification;



