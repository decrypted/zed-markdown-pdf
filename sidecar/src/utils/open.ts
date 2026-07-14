import { spawn } from "child_process";

/**
 * Open a file in the operating system's default application.
 *
 * @remarks
 * Fire-and-forget: the opener is spawned detached with its stdio ignored and
 * unreferenced, so it outlives this call and never blocks or holds the server
 * open. Failures are surfaced via the returned rejection rather than thrown
 * synchronously.
 *
 * @param filePath - Absolute path to open.
 */
export function openInSystemViewer(filePath: string): Promise<void> {
  const { command, args } = openerFor(process.platform, filePath);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    // Once it has started, let it run independently of this process.
    child.unref();
    resolve();
  });
}

function openerFor(
  platform: NodeJS.Platform,
  filePath: string,
): { command: string; args: string[] } {
  switch (platform) {
    case "darwin":
      return { command: "open", args: [filePath] };
    case "win32":
      // `start` is a cmd builtin; the empty string is the (required) window title.
      return { command: "cmd", args: ["/c", "start", "", filePath] };
    default:
      return { command: "xdg-open", args: [filePath] };
  }
}
