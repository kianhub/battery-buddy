import { execFile } from "node:child_process";

export interface ExecOptions {
  timeoutMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ExecResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  errorMessage?: string;
}

export async function runCommand(
  file: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  const timeoutMs = options.timeoutMs ?? 5000;

  return new Promise<ExecResult>((resolve) => {
    execFile(
      file,
      args,
      {
        encoding: "utf8",
        timeout: timeoutMs,
        cwd: options.cwd,
        env: options.env,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({
            ok: true,
            code: 0,
            stdout: stdout ?? "",
            stderr: stderr ?? "",
            timedOut: false,
          });
          return;
        }

        const anyError = error as NodeJS.ErrnoException & {
          code?: number | string;
          signal?: string;
          killed?: boolean;
        };
        const timedOut = Boolean(
          anyError.killed && anyError.signal === "SIGTERM",
        );
        const numericCode =
          typeof anyError.code === "number" ? anyError.code : null;

        resolve({
          ok: false,
          code: numericCode,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          timedOut,
          errorMessage: anyError.message,
        });
      },
    );
  });
}
