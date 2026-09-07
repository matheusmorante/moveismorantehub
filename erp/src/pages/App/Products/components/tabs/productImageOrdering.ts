export function moveProductImage(images: string[], fromIndex: number, toIndex: number): string[] {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) {
        return images;
    }

    const orderedImages = [...images];
    const [image] = orderedImages.splice(fromIndex, 1);
    orderedImages.splice(toIndex, 0, image);
    return orderedImages;
}

export function setProductCoverImage(images: string[], imageIndex: number): string[] {
    if (imageIndex <= 0 || imageIndex >= images.length) return images;

    const orderedImages = [...images];
    const [coverImage] = orderedImages.splice(imageIndex, 1);
    return [coverImage, ...orderedImages];
}

export function replaceProductImage(images: string[], imageIndex: number, imageUrl: string): string[] {
    if (imageIndex < 0 || imageIndex >= images.length) return images;

    const updatedImages = [...images];
    updatedImages[imageIndex] = imageUrl;
    return updatedImages;
}
