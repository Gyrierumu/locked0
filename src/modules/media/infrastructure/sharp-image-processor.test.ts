import { createHash } from "node:crypto";

import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sharpImageProcessor } from "./sharp-image-processor";
import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION } from "../domain/policy";

describe("sharp image processor", () => {
  beforeAll(() => {
    sharp.cache(false);
  });

  it("decodes, records dimensions, strips private metadata and checksums final bytes", async () => {
    const source = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#33aaff" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "Private test metadata" } } })
      .toBuffer();

    const processed = await sharpImageProcessor.process(new Uint8Array(source));
    const finalMetadata = await sharp(processed.bytes).metadata();
    expect(processed).toMatchObject({ mimeType: "image/jpeg", extension: "jpg", width: 4, height: 3 });
    expect(processed.checksumSha256).toBe(createHash("sha256").update(processed.bytes).digest("hex"));
    expect(finalMetadata.exif).toBeUndefined();
    expect(finalMetadata.icc).toBeUndefined();
  });

  it("rejects undecodable and unsupported image data", async () => {
    await expect(sharpImageProcessor.process(new Uint8Array([1, 2, 3, 4]))).rejects.toMatchObject({ code: "MEDIA_INVALID_IMAGE" });
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).gif().toBuffer();
    await expect(sharpImageProcessor.process(new Uint8Array(gif))).rejects.toMatchObject({ code: "MEDIA_UNSUPPORTED_TYPE" });
  });

  it("rejects oversized bytes and decoded dimensions", async () => {
    await expect(
      sharpImageProcessor.process(new Uint8Array(MAX_IMAGE_BYTES + 1)),
    ).rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });

    const tooWide = await sharp({
      create: {
        width: MAX_IMAGE_DIMENSION + 1,
        height: 1,
        channels: 3,
        background: "blue",
      },
    })
      .png()
      .toBuffer();
    await expect(sharpImageProcessor.process(new Uint8Array(tooWide))).rejects.toMatchObject({
      code: "MEDIA_DIMENSIONS_TOO_LARGE",
    });
  });
});
