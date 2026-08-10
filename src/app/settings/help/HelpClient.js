"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Mail, MessageSquare, ExternalLink, Send, Sparkles } from "lucide-react";

export default function HelpClient({ userEmail }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    
    // Simulate API call for sending support ticket
    setTimeout(() => {
      setStatus("success");
      setSubject("");
      setMessage("");
      setTimeout(() => setStatus("idle"), 5000);
    }, 1500);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-10 sm:py-14">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary mb-1">
            Help & Support
          </h1>
          <p className="text-secondary text-sm">
            Find answers to your questions or get in touch with our team.
          </p>
        </div>

        {/* Welcome / Beta Message */}
        <div className="relative rounded-2xl overflow-hidden p-[1px] bg-gradient-to-r from-accent via-purple-500 to-accent/50 animate-gradient shadow-lg shadow-accent/10">
          <div className="relative h-full w-full rounded-2xl bg-card p-6 md:p-8">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex gap-5 sm:items-center flex-col sm:flex-row">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-purple-500 text-white flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">We're growing together!</h3>
                <p className="text-sm text-secondary mt-2 leading-relaxed max-w-xl">
                  IB Nexus is a brand new platform built for you. You might spot a few bugs here and there, or notice some features are still on the way. If there&apos;s anything you want to see, or if something doesn&apos;t feel right, please let us know! We shape this space around your feedback.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <section className="space-y-4">
          <Link href="/dashboard/community" className="card p-5 flex items-start gap-4 hover:border-accent transition group">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-alt)] text-primary flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-primary flex items-center gap-2">
                Community Forum <ExternalLink size={14} className="text-muted" />
              </h3>
              <p className="text-xs text-secondary mt-1">Ask questions and share study strategies with other IB students.</p>
            </div>
          </Link>
        </section>

        {/* Contact Us Form */}
        <section className="card p-6 mt-6">
          <div className="flex items-center gap-3 border-b border-[var(--divider)] pb-4 mb-6">
            <Mail className="text-accent" size={20} />
            <h2 className="text-lg font-semibold">Contact Us</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input 
                type="email" 
                value={userEmail || ""} 
                disabled 
                className="input w-full bg-[var(--surface)] text-[var(--muted)] cursor-not-allowed" 
              />
              <p className="text-xs text-muted">We will reply to the email associated with your account.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <select 
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input w-full bg-[var(--input)] text-[var(--foreground)]"
              >
                <option value="" disabled>Select a topic...</option>
                <option value="account">Account & Login Issues</option>
                <option value="billing">Billing & Subscriptions</option>
                <option value="bug">Report a Bug</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea 
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="How can we help you today?"
                className="input w-full bg-[var(--input)] text-[var(--foreground)] resize-none" 
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={status === "loading"}
                className="btn btn-primary w-full sm:w-auto"
              >
                {status === "loading" ? "Sending..." : (
                  <>
                    <Send size={16} /> Send Message
                  </>
                )}
              </button>
            </div>

            {status === "success" && (
              <div className="mt-4 p-3 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-sm flex items-center gap-2">
                Your message has been sent successfully! Our support team will get back to you soon.
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
