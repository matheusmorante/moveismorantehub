import { createClient } from "npm:@supabase/supabase-js@2.99.1";

const BUCKET = "releases";
const APK_PATH = "android/latest/morantehub.apk";
const APK_NAME = "morantehub.apk";
const SIGNED_URL_TTL_SECONDS = 900;
const APK_MIME_TYPE = "application/vnd.android.package-archive";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Release service unavailable" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: release, error: releaseError } = await admin
      .from("app_release_current")
      .select("platform,version,build_number,min_supported_build,storage_path,file_size,sha256,is_mandatory,release_notes,download_url,updated_at")
      .eq("platform", "android")
      .maybeSingle();

    if (releaseError) return jsonResponse({ error: "Release metadata unavailable" }, 503);
    if (!release || release.file_size <= 0) {
      return jsonResponse({ error: "Android release not found" }, 404);
    }

    if (release.storage_path === "drive") {
      if (typeof release.download_url !== "string") {
        return jsonResponse({ error: "Android release not found" }, 404);
      }
      let artifactUrl: URL;
      try {
        artifactUrl = new URL(release.download_url);
      } catch {
        return jsonResponse({ error: "Android release not found" }, 404);
      }
      if (
        artifactUrl.protocol !== "https:" ||
        artifactUrl.hostname !== "expo.dev" ||
        !/^\/artifacts\/eas\/[a-zA-Z0-9_-]+\.apk$/.test(artifactUrl.pathname)
      ) {
        return jsonResponse({ error: "Android release not found" }, 404);
      }

      if (request.method === "GET") {
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, Location: artifactUrl.toString() },
        });
      }

      return jsonResponse({
        signedUrl: artifactUrl.toString(),
        version: release.version,
        buildNumber: release.build_number,
        fileSize: release.file_size,
        contentType: APK_MIME_TYPE,
      });
    }

    if (release.storage_path !== APK_PATH) {
      return jsonResponse({ error: "Android release not found" }, 404);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(APK_PATH, SIGNED_URL_TTL_SECONDS, { download: APK_NAME });

    if (signedError || !signed?.signedUrl) {
      return jsonResponse({ error: "APK download unavailable" }, 503);
    }

    const signedUrl = new URL(signed.signedUrl);
    signedUrl.searchParams.set("release", `${release.build_number}-${release.sha256.slice(0, 12)}`);

    if (request.method === "GET") {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: signedUrl.toString() },
      });
    }

    return jsonResponse({
      signedUrl: signedUrl.toString(),
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      version: release.version,
      buildNumber: release.build_number,
      fileSize: release.file_size,
      contentType: APK_MIME_TYPE,
    });
  } catch {
    return jsonResponse({ error: "APK download unavailable" }, 503);
  }
});
