"use server";

import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function getEmailContent(category, name) {
  let responseText = "Our support team will review your inquiry and get back to you as soon as possible.";
  let subjectText = "We received your message!";

  if (category === "bug") {
    subjectText = "Thanks for reporting a bug!";
    responseText = "Thank you for helping us improve IB Nexus! Our engineering team will look into this bug and we will notify you once it's resolved.";
  } else if (category === "feature" || category === "feedback") {
    subjectText = "Thanks for the feedback!";
    responseText = "We love hearing new ideas! Our product team will carefully review your feedback to help shape the future of IB Nexus.";
  } else if (category === "business") {
    subjectText = "Thanks for your business inquiry!";
    responseText = "Our partnerships team has received your message and will reach out to you shortly to discuss how we can work together.";
  } else if (category === "billing" || category === "account") {
    subjectText = "We received your support request";
    responseText = "Our support team will prioritize your account issue and get back to you as quickly as possible to get things resolved.";
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Thank you for reaching out!</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">We have successfully received your message regarding <strong>${category}</strong>.</p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">${responseText}</p>
      <br/>
      <p style="color: #8a8a8a; font-size: 14px;">Best regards,<br/>The IB Nexus Team</p>
    </div>
  `;

  return { html, subject: subjectText };
}

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
        const { html, subject } = getEmailContent(category, name);
        
        const res = await resend.emails.send({
          from: "IB Nexus Support <onboarding@resend.dev>",
          to: email,
          subject: subject,
          html: html,
        });
        
        if (res.error) {
          console.error("Resend API Error:", res.error);
        }
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
