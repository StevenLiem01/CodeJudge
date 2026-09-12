import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_SIZE = 10 * 1024;
const EXECUTION_TIMEOUT = 5000;

export type SupportedLanguage = "cpp" | "python" | "javascript";

function sanitizeOutput(text: string, sensitivePaths: string[]): string {
  let result = text;
  for (const p of sensitivePaths) {
    result = result.split(p).join("solution");
  }
  return result.trim();
}

async function executeProcess(
  command: string,
  args: string[],
  input: string,
  expectedOutput: string,
  sensitivePaths: string[]
) {
  const startTime = Date.now();

  return new Promise<{
    status: string;
    output: string;
    runtime: number | null;
    memory: null;
  }>((resolve) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";
    let finished = false;
    let outputExceeded = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");

      resolve({
        status: "TIME_LIMIT_EXCEEDED",
        output: "",
        runtime: Date.now() - startTime,
        memory: null,
      });
    }, EXECUTION_TIMEOUT);

    const checkOutputSize = () => {
      if (
        !outputExceeded &&
        stdout.length + stderr.length > MAX_OUTPUT_SIZE
      ) {
        outputExceeded = true;
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          child.kill("SIGKILL");

          resolve({
            status: "RUNTIME_ERROR",
            output: "Output limit exceeded (Max 10 KB)",
            runtime: Date.now() - startTime,
            memory: null,
          });
        }
      }
    };

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      checkOutputSize();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      checkOutputSize();
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      const cleanedOutput = sanitizeOutput(error.message, sensitivePaths);

      resolve({
        status: "RUNTIME_ERROR",
        output: cleanedOutput,
        runtime: Date.now() - startTime,
        memory: null,
      });
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      const runtime = Date.now() - startTime;

      if (code !== 0) {
        const rawError = stderr || stdout;
        const cleanedOutput = sanitizeOutput(rawError, sensitivePaths);

        resolve({
          status: "RUNTIME_ERROR",
          output: cleanedOutput,
          runtime,
          memory: null,
        });
        return;
      }

      const actualOutput = stdout.trim();
      const correctOutput = expectedOutput.trim();

      if (actualOutput === correctOutput) {
        resolve({
          status: "ACCEPTED",
          output: actualOutput,
          runtime,
          memory: null,
        });
        return;
      }

      resolve({
        status: "WRONG_ANSWER",
        output: actualOutput,
        runtime,
        memory: null,
      });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function runCppCode(
  sourceCode: string,
  input: string,
  expectedOutput: string
) {
  const id = randomUUID();
  const tempDir = os.tmpdir();
  const sourceName = `${id}.cpp`;
  const binaryName = process.platform === "win32" ? `${id}.exe` : `${id}.bin`;

  const sourcePath = path.join(tempDir, sourceName);
  const binaryPath = path.join(tempDir, binaryName);

  try {
    await writeFile(sourcePath, sourceCode, "utf8");

    try {
      await execFileAsync("g++", [sourcePath, "-o", binaryPath]);
    } catch (error: any) {
      const rawError = error.stderr || error.message || "";
      const cleanedOutput = sanitizeOutput(rawError, [sourcePath, tempDir]);

      return {
        status: "COMPILATION_ERROR",
        output: cleanedOutput,
        runtime: null,
        memory: null,
      };
    }

    return await executeProcess(
      binaryPath,
      [],
      input,
      expectedOutput,
      [binaryPath, sourcePath, tempDir]
    );
  } finally {
    try {
      await unlink(sourcePath);
    } catch {}
    try {
      await unlink(binaryPath);
    } catch {}
  }
}

export async function runPythonCode(
  sourceCode: string,
  input: string,
  expectedOutput: string
) {
  const id = randomUUID();
  const tempDir = os.tmpdir();
  const sourceName = `${id}.py`;
  const sourcePath = path.join(tempDir, sourceName);
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  try {
    await writeFile(sourcePath, sourceCode, "utf8");

    return await executeProcess(
      pythonCmd,
      [sourcePath],
      input,
      expectedOutput,
      [sourcePath, tempDir]
    );
  } finally {
    try {
      await unlink(sourcePath);
    } catch {}
  }
}

export async function runJsCode(
  sourceCode: string,
  input: string,
  expectedOutput: string
) {
  const id = randomUUID();
  const tempDir = os.tmpdir();
  const sourceName = `${id}.js`;
  const sourcePath = path.join(tempDir, sourceName);

  try {
    await writeFile(sourcePath, sourceCode, "utf8");

    return await executeProcess(
      "node",
      [sourcePath],
      input,
      expectedOutput,
      [sourcePath, tempDir]
    );
  } finally {
    try {
      await unlink(sourcePath);
    } catch {}
  }
}

export async function executeSubmission(
  language: string,
  sourceCode: string,
  input: string,
  expectedOutput: string
) {
  switch (language.toLowerCase()) {
    case "cpp":
    case "c++":
      return await runCppCode(sourceCode, input, expectedOutput);
    case "python":
    case "py":
      return await runPythonCode(sourceCode, input, expectedOutput);
    case "javascript":
    case "js":
      return await runJsCode(sourceCode, input, expectedOutput);
    default:
      return {
        status: "COMPILATION_ERROR",
        output: `Language "${language}" is not supported.`,
        runtime: null,
        memory: null,
      };
  }
}