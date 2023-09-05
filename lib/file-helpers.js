import fs from 'fs-extra';

/**
 * Returns the content of the given file
 *
 * @param file URI of the file to get the content for
 */
export async function getFileContent(file) {
  console.log(`Getting contents of file ${file}`);
  const path = file.replace('share://', '/share/');
  return await fs.readFile(path, 'utf8');
};