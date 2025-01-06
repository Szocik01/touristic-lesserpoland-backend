import { ErrorWithStatusCode } from "../types/custom/error";
import fs from "fs";
const promisesFs = fs.promises;
import path from "path";

// przerobić na ts i zrobić refactor

export const clearImages = (
  checkAccessToFiles: boolean,
  filePaths: string[]
) => {

  const formattedFilePaths = filePaths.map((filePath) => {
      return path.join(__dirname, "..", filePath);
  });
  return Promise.all(
    checkAccessToFiles === true
      ? formattedFilePaths.map((filePath) => {
          return promisesFs.access(filePath);
        })
      : [Promise.resolve()]
  )
    .then(() => {
      return Promise.all(
        formattedFilePaths.map((filePath) => {
          return promisesFs.unlink(filePath);
        })
      );
    })
    .catch(() => {
      const error: ErrorWithStatusCode = new Error("Could not delete some photos");
      error.statusCode = 422;
      throw error;
    });
};

