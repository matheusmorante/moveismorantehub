import { supabase } from '@/pages/utils/supabaseConfig';

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * @param file The file to upload.
 * @param path The path in storage (e.g., 'products/image.jpg').
 * @returns A promise that resolves to the public URL.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        // En Supabase el bucket suele ser el primer segmento del path
        // o se define por separado. Aquí asumimos un bucket llamado "uploads".
        const bucket = "products";
        
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    } catch (error) {
        console.error("Error uploading file to storage:", error);
        throw error;
    }
};
