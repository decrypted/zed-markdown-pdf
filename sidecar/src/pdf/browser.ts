import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import puppeteer, { Browser } from "puppeteer-core";
import PCR from "puppeteer-chromium-resolver";

import { Logger } from "../utils/logger";

const LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"];

/**
 * Launch a headless Chromium for printing.
 *
 * @remarks
 * Prefers a locally installed browser ({@link findLocalBrowser}); otherwise
 * falls back to a `puppeteer-chromium-resolver` download into the user cache.
 *
 * @param logger - Sink for which-browser diagnostics.
 * @returns A launched Puppeteer {@link Browser}.
 * @throws If the resolver returns a Chromium binary that is not launchable.
 */
export async function launchBrowser(logger: Logger): Promise<Browser> {
  const localChrome = findLocalBrowser();
  if (localChrome) {
    logger.info(`Using local browser: ${localChrome}`);
    return puppeteer.launch({
      executablePath: localChrome,
      headless: true,
      args: LAUNCH_ARGS,
    });
  }

  logger.info("No local Chrome detected; falling back to PCR download");
  const stats = await PCR({
    detectionPath: path.join(os.homedir(), ".cache", "markdown-pdf-export"),
    folderName: "chromium",
    hosts: [
      "https://storage.googleapis.com",
      "https://cdn.npmmirror.com/binaries/chromium-browser-snapshots",
    ],
    cacheRevisions: 2,
    retry: 3,
    silent: true,
  });

  if (!stats.launchable) {
    throw new Error("PCR resolved a Chromium binary but it is not launchable.");
  }

  return puppeteer.launch({
    executablePath: stats.executablePath,
    headless: true,
    args: LAUNCH_ARGS,
  });
}

/**
 * Locate an installed Chromium-family browser for the current platform.
 *
 * @remarks
 * Probes a platform-specific list of well-known install locations (Chrome,
 * Edge, Brave, Chromium) and returns the first one that is a regular file.
 *
 * @returns The executable path, or `undefined` if none is found.
 */
export function findLocalBrowser(): string | undefined {
  const candidates: string[] = [];
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else if (process.platform === "win32") {
    const pf = process.env["PROGRAMFILES"] ?? "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    const local = process.env["LOCALAPPDATA"] ?? "";
    candidates.push(
      path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(local, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
      "/usr/bin/brave-browser",
      "/snap/bin/chromium",
    );
  }
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}
