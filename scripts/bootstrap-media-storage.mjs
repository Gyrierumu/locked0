import { createClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function isBucketNotFound(error) {
  const status = Number(error?.status);
  const statusCode = Number(error?.statusCode);

  if (status === 404 || (!Number.isFinite(status) && statusCode === 404)) {
    return true;
  }

  return (
    status === 400 &&
    statusCode === 404 &&
    error?.code === "NoSuchBucket" &&
    String(error?.message ?? "").trim().toLowerCase() === "bucket not found"
  );
}

if (!process.argv.includes("--yes")) {
  console.error("Bootstrap nao executado. Confirme explicitamente com: pnpm media:bootstrap -- --yes");
  process.exitCode = 1;
} else {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const finalBucket = process.env.SUPABASE_MEDIA_BUCKET || "locked0-media";
  const stagingBucket = process.env.SUPABASE_MEDIA_STAGING_BUCKET || "locked0-media-staging";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes do bootstrap.");
    process.exitCode = 1;
  } else {
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    async function reconcileBucket(id, isPublic) {
      const options = {
        public: isPublic,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      };
      const current = await client.storage.getBucket(id);
      if (current.error) {
        if (!isBucketNotFound(current.error)) {
          throw new Error(`Falha ao inspecionar bucket ${id}.`);
        }
        const created = await client.storage.createBucket(id, options);
        if (created.error) throw new Error(`Falha ao criar bucket ${id}.`);
        console.log(`Bucket criado: ${id}`);
        return;
      }
      const updated = await client.storage.updateBucket(id, options);
      if (updated.error) throw new Error(`Falha ao reconciliar bucket ${id}.`);
      console.log(`Bucket reconciliado: ${id}`);
    }

    try {
      console.log(`Projeto Supabase alvo: ${new URL(supabaseUrl).origin}`);
      await reconcileBucket(stagingBucket, false);
      await reconcileBucket(finalBucket, true);
      console.log("Bootstrap de Media Storage concluido.");
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Falha inesperada no bootstrap.");
      process.exitCode = 1;
    }
  }
}
