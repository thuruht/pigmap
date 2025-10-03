// A simplified metadata stripper focusing on common image formats.
// This is a placeholder and should be replaced with a more robust library
// if available in the environment.

/**
 * Strips metadata from a JPEG image buffer.
 * This is a very basic implementation that looks for the APP1 marker (EXIF)
 * and removes it. It's not comprehensive.
 *
 * @param {ArrayBuffer} buffer The image data.
 * @returns {ArrayBuffer} The image data without EXIF metadata.
 */
function stripJpegMetadata(buffer) {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xFFD8) {
        console.log("Not a valid JPEG file.");
        return buffer; // Not a JPEG, return as-is
    }

    let offset = 2;
    const segments = [];

    while (offset < view.byteLength) {
        const marker = view.getUint16(offset);
        offset += 2;

        // End of image marker
        if (marker === 0xFFD9) {
            break;
        }

        // Skip markers without length
        if ((marker >= 0xFFD0 && marker <= 0xFFD9) || marker === 0xFF01) {
            continue;
        }

        const length = view.getUint16(offset);

        // We are looking for the APP1 marker (0xFFE1), which contains EXIF data.
        // We will keep all other segments.
        if (marker !== 0xFFE1) {
            // Copy the segment (marker + length + data)
            const segment = buffer.slice(offset - 2, offset + length);
            segments.push(segment);
        }

        offset += length;
    }

    // Reconstruct the image from the kept segments
    const newFileParts = [new Uint8Array([0xFF, 0xD8]), ...segments.map(s => new Uint8Array(s)), new Uint8Array([0xFF, 0xD9])];
    const totalLength = newFileParts.reduce((acc, part) => acc + part.length, 0);
    const newBuffer = new Uint8Array(totalLength);

    let currentOffset = 0;
    for(const part of newFileParts) {
        newBuffer.set(part, currentOffset);
        currentOffset += part.length;
    }

    return newBuffer.buffer;
}

/**
 * Main function to strip metadata from a file.
 *
 * @param {File} file The file to process.
 * @returns {Promise<Blob>} A new Blob with metadata stripped.
 */
export async function stripMetadata(file) {
    const buffer = await file.arrayBuffer();

    // Basic check for JPEG
    if (file.type === 'image/jpeg') {
        const strippedBuffer = stripJpegMetadata(buffer);
        return new Blob([strippedBuffer], { type: file.type });
    }

    // For other image types, we currently don't have a stripper.
    // A more robust solution would handle PNG (tEXt, iTXt chunks) etc.
    // For now, we return the original file as a Blob.
    console.warn(`Metadata stripping not implemented for ${file.type}.`);
    return new Blob([buffer], { type: file.type });
}