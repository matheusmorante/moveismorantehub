import { toast } from "react-toastify";

/**
 * Utility for image compression using browser-image-compression
 */
export const compressImage = async (file: File, options?: { maxMB?: number, maxWidth?: number, fileType?: string, initialQuality?: number }): Promise<string> => {
    try {
        const imageCompression = (await import('browser-image-compression')).default;
        
        const compressionOptions = {
            maxSizeMB: options?.maxMB || 0.1,
            maxWidthOrHeight: options?.maxWidth || 1200,
            useWebWorker: true,
            initialQuality: options?.initialQuality || 0.75,
            fileType: options?.fileType,
        };

        const compressedFile = await imageCompression(file, compressionOptions);
        
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
        });
    } catch (err) {
        console.error("Erro ao comprimir imagem:", err);
        toast.error("Falha ao processar imagem.");
        throw err;
    }
};

/**
 * Returns the compressed file directly as a File object (ideal for uploads)
 */
export const compressImageToFile = async (file: File, options?: { maxMB?: number, maxWidth?: number, fileType?: string, initialQuality?: number }): Promise<File> => {
    try {
        const imageCompression = (await import('browser-image-compression')).default;
        
        const compressionOptions = {
            maxSizeMB: options?.maxMB || 0.1,
            maxWidthOrHeight: options?.maxWidth || 1200,
            useWebWorker: true,
            initialQuality: options?.initialQuality || 0.75,
            fileType: options?.fileType,
        };

        const compressedFile = await imageCompression(file, compressionOptions);
        // Ensure its a File object. If we forced a fileType like image/webp, change the extension if needed.
        let newName = file.name;
        if (options?.fileType === 'image/webp' && !newName.toLowerCase().endsWith('.webp')) {
            newName = newName.replace(/\.[^/.]+$/, "") + ".webp";
        }
        return new File([compressedFile], newName, { type: compressedFile.type });
    } catch (err) {
        console.error("Erro ao comprimir imagem para arquivo:", err);
        toast.error("Falha ao processar imagem.");
        throw err;
    }
};
