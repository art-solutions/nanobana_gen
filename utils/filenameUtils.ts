export const generateOutputFilename = (
  originalName: string,
  findPattern: string,
  replacePattern: string
): string => {
  // 1. If patterns exist, try regex replacement
  if (findPattern && replacePattern) {
    try {
      const regex = new RegExp(findPattern);
      
      if (regex.test(originalName)) {
          const timestamp = Date.now().toString();
          // Replace TIMESTAMP placeholder
          const preparedReplacement = replacePattern.replace(/TIMESTAMP/g, timestamp);
          
          // Apply regex replacement
          let newName = originalName.replace(regex, preparedReplacement);
          
          // 2. Check if the new name already has a valid image extension
          // Since Gemini generates PNGs, the user might explicitly want .png in the name
          const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(newName);
          
          if (hasExtension) {
            return newName;
          }

          // 3. Fallback: Preserve original extension if none was provided
          const lastDotIndex = originalName.lastIndexOf('.');
          if (lastDotIndex !== -1) {
              const ext = originalName.substring(lastDotIndex); // e.g. ".jpg"
              if (!newName.endsWith(ext)) {
                  newName += ext;
              }
          }
          
          return newName;
      }
    } catch (e) {
      console.warn("Invalid regex or replacement pattern, falling back.", e);
    }
  }

  // Fallback if no match
  return `localized_${originalName}`;
};