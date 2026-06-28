import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const action = payload?.action ?? "create";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create") {
      const {
        email,
        password,
        full_name,
        phone = null,
        address = null,
        city = null,
        role = "vendor",
      } = payload ?? {};

      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required." }, 400);
      }

      const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirmed: true,
        user_metadata: {
          full_name: full_name ?? null,
          role,
          phone: phone ?? null,
          address: address ?? null,
          city: city ?? null,
        },
        app_metadata: { role },
      });

      if (createUserError || !createdUserData?.user) {
        return jsonResponse({ error: createUserError?.message || "Failed to create auth user." }, 409);
      }

      const { data: profileData, error: profileError } = await admin.from("profiles").upsert(
        {
          id: createdUserData.user.id,
          email: createdUserData.user.email,
          full_name: full_name ?? null,
          phone: phone ?? null,
          address: address ?? null,
          city: city ?? null,
          role,
          is_admin: false,
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      ).select().single();

      if (profileError) {
        await admin.auth.admin.deleteUser(createdUserData.user.id);
        return jsonResponse({ error: profileError.message }, 500);
      }

      return jsonResponse({ success: true, user: createdUserData.user, profile: profileData });
    }

    if (action === "update") {
      const { id, email, password, full_name, phone, address, city, role } = payload ?? {};

      if (!id) {
        return jsonResponse({ error: "Vendor id is required." }, 400);
      }

      const adminUpdates: Record<string, unknown> = {};
      if (typeof email === "string") adminUpdates.email = email;
      if (typeof password === "string") adminUpdates.password = password;

      const userMetadata: Record<string, unknown> = {};
      if (typeof full_name !== "undefined") userMetadata.full_name = full_name;
      if (typeof phone !== "undefined") userMetadata.phone = phone;
      if (typeof address !== "undefined") userMetadata.address = address;
      if (typeof city !== "undefined") userMetadata.city = city;
      if (typeof role !== "undefined") userMetadata.role = role;
      if (Object.keys(userMetadata).length > 0) adminUpdates.user_metadata = userMetadata;

      const appMetadata: Record<string, unknown> = {};
      if (typeof role !== "undefined") appMetadata.role = role;
      if (Object.keys(appMetadata).length > 0) adminUpdates.app_metadata = appMetadata;

      const { data: updatedUserData, error: updateUserError } = await admin.auth.admin.updateUserById(id, adminUpdates);
      if (updateUserError || !updatedUserData?.user) {
        return jsonResponse({ error: updateUserError?.message || "Failed to update auth user." }, 409);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (typeof full_name !== "undefined") profileUpdate.full_name = full_name;
      if (typeof phone !== "undefined") profileUpdate.phone = phone;
      if (typeof address !== "undefined") profileUpdate.address = address;
      if (typeof city !== "undefined") profileUpdate.city = city;
      if (typeof role !== "undefined") profileUpdate.role = role;
      if (typeof email === "string") profileUpdate.email = email;

      let profileData = null;
      if (Object.keys(profileUpdate).length > 0) {
        const { data, error: profileError } = await admin.from("profiles").update(profileUpdate).eq("id", id).select().single();
        if (profileError) {
          return jsonResponse({ error: profileError.message }, 500);
        }
        profileData = data;
      }

      return jsonResponse({ success: true, user: updatedUserData.user, profile: profileData });
    }

    if (action === "delete") {
      const { id } = payload ?? {};
      if (!id) {
        return jsonResponse({ error: "Vendor id is required." }, 400);
      }

      const { error: authError } = await admin.auth.admin.deleteUser(id);
      const { error: profileError } = await admin.from("profiles").delete().eq("id", id);

      if (authError && !authError.message?.toLowerCase().includes("not found")) {
        if (profileError) {
          return jsonResponse({ error: `${authError.message} | ${profileError.message}` }, 500);
        }
        return jsonResponse({ error: authError.message }, 500);
      }

      if (profileError) {
        return jsonResponse({ error: profileError.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});