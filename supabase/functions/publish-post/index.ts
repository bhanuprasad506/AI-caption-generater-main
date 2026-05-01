import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postId, caption, platform, metaToken, imageUrl } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let metaPostId: string | null = null;

    if (platform === "instagram") {
      // Step 1: Get Instagram Business Account ID
      const meResp = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${metaToken}`
      );
      const meData = await meResp.json();
      const page = meData?.data?.[0];
      if (!page) throw new Error("No Facebook page found. Make sure your account has a connected page.");

      const igResp = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${metaToken}`
      );
      const igData = await igResp.json();
      const igAccountId = igData?.instagram_business_account?.id;
      if (!igAccountId) throw new Error("No Instagram Business Account linked to this page.");

      // Step 2: Create media container
      const containerBody: Record<string, string> = {
        caption,
        access_token: metaToken,
      };
      if (imageUrl) {
        containerBody.image_url = imageUrl;
      } else {
        // Text-only not supported on Instagram — use a placeholder or skip
        throw new Error("Instagram requires an image. Please attach a product photo.");
      }

      const containerResp = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerBody),
        }
      );
      const containerData = await containerResp.json();
      if (containerData.error) throw new Error(containerData.error.message);

      // Step 3: Publish
      const publishResp = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: metaToken,
          }),
        }
      );
      const publishData = await publishResp.json();
      if (publishData.error) throw new Error(publishData.error.message);
      metaPostId = publishData.id;

    } else if (platform === "facebook") {
      // Post to Facebook Page feed
      const meResp = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${metaToken}`
      );
      const meData = await meResp.json();
      const page = meData?.data?.[0];
      if (!page) throw new Error("No Facebook page found.");

      const postBody: Record<string, string> = {
        message: caption,
        access_token: page.access_token,
      };
      if (imageUrl) postBody.url = imageUrl;

      const endpoint = imageUrl
        ? `https://graph.facebook.com/v19.0/${page.id}/photos`
        : `https://graph.facebook.com/v19.0/${page.id}/feed`;

      const fbResp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });
      const fbData = await fbResp.json();
      if (fbData.error) throw new Error(fbData.error.message);
      metaPostId = fbData.id ?? fbData.post_id;
    }

    // Update post status in DB
    await supabase
      .from("scheduled_posts")
      .update({ status: "published", meta_post_id: metaPostId })
      .eq("id", postId);

    return new Response(JSON.stringify({ success: true, metaPostId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-post error:", e);

    // Mark as failed in DB if we have postId
    try {
      const { postId } = await new Response(req.body).json().catch(() => ({}));
      if (postId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("scheduled_posts")
          .update({ status: "failed", error_message: e instanceof Error ? e.message : "Unknown error" })
          .eq("id", postId);
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
