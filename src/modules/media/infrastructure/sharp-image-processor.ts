import "server-only";

import { createHash } from "node:crypto";

import sharp, { type Sharp } from "sharp";

import { MediaError } from "../domain/errors";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  type MediaMimeType,
} from "../domain/policy";
import type {
  MediaImageProcessor,
  ProcessedMediaImage,
} from "../application/ports/image-processor";

type OutputFormat = Readonly<{
  mimeType: MediaMimeType;
  extension: ProcessedMediaImage["extension"];
}>;

function outputFormat(format: string | undefined, compression: string | undefined): OutputFormat {
  if (format === "jpeg") return { mimeType: "image/jpeg", extension: "jpg" };
  if (format === "png") return { mimeType: "image/png", extension: "png" };
  if (format === "webp") return { mimeType: "image/webp", extension: "webp" };
  if (format === "heif" && compression === "av1") {
    return { mimeType: "image/avif", extension: "avif" };
  }
  throw new MediaError("MEDIA_UNSUPPORTED_TYPE");
}

function encoder(pipeline: Sharp, format: OutputFormat): Sharp {
  if (format.mimeType === "image/jpeg") {
    return pipeline.jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: false });
  }
  if (format.mimeType === "image/png") {
    return pipeline.png({ compressionLevel: 6, adaptiveFiltering: false });
  }
  if (format.mimeType === "image/webp") {
    return pipeline.webp({ quality: 95, alphaQuality: 100, smartSubsample: true });
  }
  return pipeline.avif({ quality: 85, effort: 4, chromaSubsampling: "4:4:4" });
}

function validateDimensions(width: number | undefined, height: number | undefined): void {
  if (!width || !height) throw new MediaError("MEDIA_INVALID_IMAGE");
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new MediaError("MEDIA_DIMENSIONS_TOO_LARGE");
  }
}

export const sharpImageProcessor: MediaImageProcessor = {
  async process(bytes) {
    if (bytes.byteLength <= 0) throw new MediaError("MEDIA_INVALID_IMAGE");
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new MediaError("MEDIA_TOO_LARGE");

    try {
      const source = sharp(bytes, {
        failOn: "error",
        limitInputPixels: MAX_IMAGE_PIXELS,
        sequentialRead: true,
      });
      const metadata = await source.metadata();
      validateDimensions(metadata.width, metadata.height);
      if ((metadata.pages ?? 1) > 1) throw new MediaError("MEDIA_INVALID_IMAGE");

      const format = outputFormat(metadata.format, metadata.compression);
      const result = await encoder(source.rotate(), format).toBuffer({ resolveWithObject: true });
      validateDimensions(result.info.width, result.info.height);
      if (result.data.byteLength > MAX_IMAGE_BYTES) throw new MediaError("MEDIA_TOO_LARGE");

      return {
        bytes: new Uint8Array(result.data),
        mimeType: format.mimeType,
        extension: format.extension,
        width: result.info.width,
        height: result.info.height,
        checksumSha256: createHash("sha256").update(result.data).digest("hex"),
      };
    } catch (error) {
      if (error instanceof MediaError) throw error;
      throw new MediaError("MEDIA_INVALID_IMAGE");
    }
  },
};
