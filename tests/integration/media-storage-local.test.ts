import "dotenv/config";

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hostname = (() => {
  try { return url ? new URL(url).hostname : ""; } catch { return ""; }
})();
const isLocal = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
const localDescribe = isLocal && serviceKey ? describe : describe.skip;

localDescribe("Media Storage local boundary", () => {
  it("keeps staging private, final public and signed upload scoped to staging", async () => {
    const admin = createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const staging = process.env.SUPABASE_MEDIA_STAGING_BUCKET || "locked0-media-staging";
    const final = process.env.SUPABASE_MEDIA_BUCKET || "locked0-media";
    const [stagingBucket, finalBucket] = await Promise.all([
      admin.storage.getBucket(staging),
      admin.storage.getBucket(final),
    ]);
    if (stagingBucket.error) throw stagingBucket.error;
    if (finalBucket.error) throw finalBucket.error;
    expect(stagingBucket.data.public).toBe(false);
    expect(finalBucket.data.public).toBe(true);

    const path = `tests/${randomUUID()}/source`;
    try {
      const target = await admin.storage.from(staging).createSignedUploadUrl(path, { upsert: false });
      if (target.error) throw target.error;
      expect(target.data.path).toBe(path);
      expect(target.data.signedUrl).toContain(`/object/upload/sign/${staging}/`);
      expect(target.data.signedUrl).not.toContain(`/object/upload/sign/${final}/`);
    } finally {
      await admin.storage.from(staging).remove([path]);
    }
  }, 30_000);
});
