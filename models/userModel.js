const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const feeStructure = {
    "Senior Batch": 1100,
    "Prarambhik": 800,
    "Praveshika Pratham": 900,
    "Praveshika Purna": 900,
    "Madhyama Pratham": 1000,
    "Madhyama Purna": 1000,
    "Visharad Pratham": 1200,
    "Visharad Purna": 1200,
    "Alankar Pratham": 1500,
    "Alankar Purna": 1500,
    "TMV-BA": 1200
}

class User {
    static tableName = 'users';

    static async create(userData) {
        const exam_fee = userData.exam_fee || feeStructure[userData.exam_level] || 800;
        const profilepicture = userData.profilepicture || "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/oi0mzzlbzrjspastm3dl";
        

        const { data, error } = await supabase
            .from(this.tableName)
            .insert([{
                ...userData,
                exam_fee,
                profilepicture,
                is_verified: userData.is_verified || false,
                verifiedat: userData.verifiedat || null,
                resetpasswordtoken: userData.resetpasswordtoken || null,
                resetpasswordexpires: userData.resetpasswordexpires || null
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

    static async updateOne(query, updateData) {
        let queryBuilder = supabase.from(this.tableName).update(updateData);
        
        Object.keys(query).forEach(key => {
            queryBuilder = queryBuilder.eq(key, query[key]);
        });

        const { data, error } = await queryBuilder.select().single();
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

module.exports = User;


