"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function submitContactForm(prevState, formData) {
  try {
    const name = formData.get("name");
    const email = formData.get("email");
    const category = formData.get("category");
    const message = formData.get("message");

    if (!name || !email || !category || !message) {
      return { error: "Please fill out all fields." };
    }

    const supabase = await createServerClient();

    const { error } = await supabase
      .from("ib_contact_messages")
      .insert({
        name,
        email,
        category,
        message,
        status: "pending"
      });

    if (error) {
      console.error("Error inserting contact message:", error);
      return { error: "Failed to send message. Please try again later." };
    }

    return { success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { error: "An unexpected error occurred." };
  }
}
