const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const validLevels = [
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
];

const validTypes = ['image', 'pdf'];

class StudyMaterial {
    static tableName = 'study_materials';

    static async create(materialData) {
        // Validate type
        if (!validTypes.includes(materialData.type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate level
        if (!validLevels.includes(materialData.level)) {
            throw new Error(`Invalid level. Must be one of: ${validLevels.join(', ')}`);
        }

        const { data, error } = await supabase
            .from(this.tableName)
            .insert([{
                title: materialData.title,
                type: materialData.type,
                url: materialData.url,
                category: materialData.category?.trim(),
                level: materialData.level,
                createdat: materialData.createdat
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
        // Validate type if provided
        if (updateData.type && !validTypes.includes(updateData.type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate level if provided
        if (updateData.level && !validLevels.includes(updateData.level)) {
            throw new Error(`Invalid level. Must be one of: ${validLevels.join(', ')}`);
        }

        // Trim category if provided
        if (updateData.category) {
            updateData.category = updateData.category.trim();
        }

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
        // Validate type if provided
        if (updateData.type && !validTypes.includes(updateData.type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate level if provided
        if (updateData.level && !validLevels.includes(updateData.level)) {
            throw new Error(`Invalid level. Must be one of: ${validLevels.join(', ')}`);
        }

        // Trim category if provided
        if (updateData.category) {
            updateData.category = updateData.category.trim();
        }

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

    static async distinct(field) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select(field);

        if (error) throw error;
        
        // Extract unique values from the field
        const uniqueValues = [...new Set(data.map(item => item[field]))].filter(val => val && val.trim() !== '');
        return uniqueValues.sort();
    }
}

module.exports = StudyMaterial;
