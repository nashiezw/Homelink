import os from "os";
import path from "path";

function isServerlessTaskDirectory(cwd: string) {
  return cwd === "/var/task" || cwd.startsWith("/var/task/");
}

function isServerlessRuntime(cwd: string) {
  return process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || isServerlessTaskDirectory(cwd);
}

export function getWritableDataDir() {
  const configured = process.env.HOUSELINK_DATA_DIR || process.env.DATA_DIR;
  if (configured) return configured;

  const cwd = process.cwd();
  if (isServerlessRuntime(cwd)) {
    return path.join(os.tmpdir(), "houselink-data");
  }

  return path.join(cwd, ".data");
}
