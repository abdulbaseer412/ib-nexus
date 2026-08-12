"use server";

import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "IB Nexus Support <onboarding@resend.dev>",
          to: email,
          subject: "We received your message!",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Thank you for reaching out!</h2>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">We have successfully received your message regarding <strong>${category}</strong>.</p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">Our support team will review your inquiry and get back to you as soon as possible.</p>
              <br/>
              <p style="color: #8a8a8a; font-size: 14px;">Best regards,<br/>The IB Nexus Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send acknowledgment email:", emailError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Contact form error:", error);
    return { error: "An unexpected error occurred." };
  }
}
