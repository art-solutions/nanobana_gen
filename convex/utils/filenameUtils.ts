/**
 * Filename Utility Functions
 * Ported from frontend utils/filenameUtils.ts
 */

/**
 * Generates output filename based on regex patterns
 * @param originalName - Original filename or URL
 * @param findPattern - Regex pattern to match
 * @param replacePattern - Replacement pattern (supports TIMESTAMP placeholder)
 * @returns Generated filename
 */
export const generateOutputFilename = (
  originalName: string,
  findPattern: string,
  replacePattern: string
): string => {
  // Extract filename from URL if needed
  let filename = originalName;
  if (originalName.startsWith("http")) {
    const urlParts = originalName.split("/");
    filename = urlParts[urlParts.length - 1].split("?")[0] || "image";
  }

  // 1. If patterns exist, try regex replacement
  if (findPattern && replacePattern) {
    try {
      const regex = new RegExp(findPattern);

      if (regex.test(filename)) {
        const timestamp = Date.now().toString();
        // Replace TIMESTAMP placeholder
        const preparedReplacement = replacePattern.replace(
          /TIMESTAMP/g,
          timestamp
        );

        // Apply regex replacement
        let newName = filename.replace(regex, preparedReplacement);

        // 2. Check if the new name already has a valid image extension
        const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(newName);

        if (hasExtension) {
          return newName;
        }

        // 3. Fallback: Add .png since Gemini generates PNGs
        return newName + ".png";
      }
    } catch (e) {
      console.warn("Invalid regex or replacement pattern, falling back.", e);
    }
  }

  // Fallback if no match
  const timestamp = Date.now().toString();
  return `localized_${timestamp}.png`;
};

/**
 * Extracts filename from URL
 */
export const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const filename = pathParts[pathParts.length - 1];
    return filename || "image";
  } catch {
    return "image";
  }
};
