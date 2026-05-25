import * as path from "path";

/**
 * Map a file path's extension to an image MIME type for data-URI embedding.
 *
 * @param filePath - Path whose extension determines the MIME type.
 * @returns The matching `image/*` type, or `application/octet-stream` if unknown.
 */
export function imageMime(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Map a font file path's extension to a MIME type for data-URI embedding.
 *
 * @param filePath - Path whose extension determines the MIME type.
 * @returns The matching `font/*` type, or `application/octet-stream` if unknown.
 */
export function fontMime(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    case ".ttf":
      return "font/ttf";
    default:
      return "application/octet-stream";
  }
}
