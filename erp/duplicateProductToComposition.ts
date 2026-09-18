import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const originalProductId = '5d61e058-002e-49d7-9b3d-e4bae4d03d5e';
    
    // 1. Get original product
    const { data: prodData, error: prodErr } = await supabase.from('products').select('*').eq('id', originalProductId).single();
    if (prodErr) throw prodErr;
    
    // 2. Insert new product as composition
    const newProduct = {
        ...prodData,
        item_type: 'composition',
        slug: prodData.slug ? prodData.slug + '-comp-' + Date.now() : undefined,
    };
    if (newProduct.code) {
        newProduct.code = newProduct.code + '-COMP';
    }
    delete newProduct.id;
    delete newProduct.created_at;
    delete newProduct.updated_at;

    const { data: insertedProd, error: insertProdErr } = await supabase.from('products').insert(newProduct).select('*').single();
    if (insertProdErr) throw insertProdErr;

    console.log("Inserted Composition Product:", insertedProd.id);

    // 3. Duplicate product_categories
    const { data: prodCats } = await supabase.from('product_categories').select('*').eq('product_id', originalProductId);
    if (prodCats && prodCats.length > 0) {
        const newCats = prodCats.map(c => ({
            product_id: insertedProd.id,
            category_id: c.category_id
        }));
        await supabase.from('product_categories').insert(newCats);
    }

    // 4. Duplicate product_images
    const { data: prodImgs } = await supabase.from('product_images').select('*').eq('product_id', originalProductId);
    if (prodImgs && prodImgs.length > 0) {
        const newImgs = prodImgs.map(img => {
            const newImg = { ...img, product_id: insertedProd.id };
            delete newImg.id;
            delete newImg.created_at;
            return newImg;
        });
        await supabase.from('product_images').insert(newImgs);
    }

    // 5. Duplicate product_variations
    const { data: vars } = await supabase.from('product_variations').select('*').eq('product_id', originalProductId);
    if (vars && vars.length > 0) {
        for (const v of vars) {
            const newVar = { ...v, product_id: insertedProd.id };
            if (newVar.sku) newVar.sku = newVar.sku + '-COMP';
            delete newVar.id;
            delete newVar.created_at;
            delete newVar.updated_at;
            const { data: insVar, error: insVarErr } = await supabase.from('product_variations').insert(newVar).select('*').single();
            if (insVarErr) {
                console.error("Error inserting variation", insVarErr);
            } else {
                console.log("Inserted Variation:", insVar.id);
            }
        }
    }
    
    } catch (e) {
        console.error("Caught error:", e);
    }
}

run();
