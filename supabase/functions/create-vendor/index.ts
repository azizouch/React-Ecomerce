import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const action = payload.action ?? "create";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ====================================================
    // CREATE
    // ====================================================

    if (action === "create") {
      const {
        email,
        password,
        full_name,
        phone = null,
        address = null,
        city = null,
        role = "vendor",
      } = payload;

      if (!email || !password) {
    return jsonResponse(
      { error: "Email and password are required." },
      400
    );
  }

  // ==========================================
  // CHECK IF EMAIL ALREADY EXISTS
  // ==========================================

  const { data: usersData, error: usersError } =
    await admin.auth.admin.listUsers();

  if (usersError) {
    return jsonResponse(
      { error: usersError.message },
      500
    );
  }

  const existingUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return jsonResponse(
      {
        error: "A user with this email already exists.",
      },
      409
    );
  }

  // ==========================================
  // CREATE USER
  // ==========================================

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        address,
        city,
        role,
      },
      app_metadata: {
        role,
      },
    });

  if (authError) {
    return jsonResponse(
      {
        error: authError.message,
      },
      500
    );
  }

      const { error: profileError } = await admin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          phone,
          address,
          city,
          role,
        });

      if (profileError) {
        await admin.auth.admin.deleteUser(authData.user.id);

        return jsonResponse(
          {
            error: profileError.message,
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        user: authData.user,
      });
    }

    // ====================================================
    // UPDATE
    // ====================================================

    if (action === "update") {
      const {
        id,
        email,
        password,
        full_name,
        phone,
        address,
        city,
        role,
      } = payload;

      if (!id) {
        return jsonResponse(
          { error: "User id is required." },
          400
        );
      }

      const authUpdates: Record<string, unknown> = {};

      if (typeof email === "string" && email.length > 0) {
        authUpdates.email = email;
      }

      if (typeof password === "string" && password.length > 0) {
        authUpdates.password = password;
      }

      const userMetadata: Record<string, unknown> = {};

      if (full_name !== undefined) userMetadata.full_name = full_name;
      if (phone !== undefined) userMetadata.phone = phone;
      if (address !== undefined) userMetadata.address = address;
      if (city !== undefined) userMetadata.city = city;
      if (role !== undefined) userMetadata.role = role;

      if (Object.keys(userMetadata).length > 0) {
        authUpdates.user_metadata = userMetadata;
      }

      if (role !== undefined) {
        authUpdates.app_metadata = {
          role,
        };
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.updateUserById(id, authUpdates);

      if (authError || !authData?.user) {
        return jsonResponse(
          {
            error:
              authError?.message ??
              "Failed to update authentication user.",
          },
          409
        );
      }

      const profileUpdates: Record<string, unknown> = {};

      if (email !== undefined) profileUpdates.email = email;
      if (full_name !== undefined) profileUpdates.full_name = full_name;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (address !== undefined) profileUpdates.address = address;
      if (city !== undefined) profileUpdates.city = city;
      if (role !== undefined) profileUpdates.role = role;

      let profile = null;

      if (Object.keys(profileUpdates).length > 0) {
        const { data, error } = await admin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          return jsonResponse(
            {
              error: error.message,
            },
            500
          );
        }

        profile = data;
      }

      return jsonResponse({
        success: true,
        user: authData.user,
        profile,
      });
    }

    // ====================================================
    // DELETE
    // ====================================================

    if (action === "delete") {
      const { id } = payload;

      if (!id) {
        return jsonResponse(
          { error: "User id is required." },
          400
        );
      }

      // Delete Auth user first
      const { error: authError } = await admin.auth.admin.deleteUser(id);

      if (authError) {
        return jsonResponse(
          {
            error: authError.message,
          },
          500
        );
      }

      // Delete profile (if it still exists)
      const { error: profileError } = await admin
        .from("profiles")
        .delete()
        .eq("id", id);

      if (profileError) {
        return jsonResponse(
          {
            error: profileError.message,
          },
          500
        );
      }

      return jsonResponse({
        success: true,
      });
    }
    return jsonResponse(
      {
        error: "Unsupported action.",
      },
      400
    );
  } catch (error) {
    console.error("CREATE-VENDOR ERROR:");
    console.error(error);

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});