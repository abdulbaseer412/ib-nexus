// src/app/api/resources/upload/route.js

/**
 * File upload endpoint for resources.
 * Uploads file to Supabase Storage `resources` bucket and returns the public URL.
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_USER_SIZE = 20 * 1024 * 1024;   // 20 MB
const MAX_ADMIN_SIZE = 50 * 1024 * 1024;  // 50 MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

function sanitizeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/__+/g, "_")
    .substring(0, 200);
}

export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const supabase = await createServerClient();
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zdzeajqqxecyvvfrizmp.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-J4e0OL2owsV8UyDZuG0IA_PESeq3th"
  );

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const formData = await request.formData();
  const file = formData.get("file");
  const isAdminUpload = formData.get("admin_upload") === "true";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type "${file.type}" is not supported.` }, { status: 400 });
  }

  // Validate size
  const maxSize = isAdmin ? MAX_ADMIN_SIZE : MAX_USER_SIZE;
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return NextResponse.json({ error: `File too large. Maximum size is ${maxMB}MB.` }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name);
  const uniqueName = `${Date.now()}_${safeName}`;
  const folder = (isAdmin && isAdminUpload) ? "platform" : `user/${user.id}`;
  const storagePath = `${folder}/${uniqueName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("resources")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Failed to upload file. " + uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("resources")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    url: publicUrl,
    path: storagePath,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
