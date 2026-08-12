"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, LockKeyhole, CheckCircle2 } from "lucide-react";
import { submitContactForm } from "./actions";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, null);
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (state?.success) {
    return (
      <div className="card rounded-[24px] border border-subtle bg-card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">Message Sent!</h2>
        <p className="text-secondary mb-8">
          Thank you for reaching out. We've received your message and will get back to you shortly.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="card rounded-[24px] border border-subtle bg-card p-6">
      <h2 className="text-xl font-bold text-primary">Send a message</h2>
      <p className="mt-2 text-sm text-secondary">Choose a category so we can understand the context of your enquiry.</p>
      
      {state?.error && (
        <div className="mt-4 p-3 bg-danger/10 text-danger rounded-xl text-sm font-medium">
          {state.error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-primary">
          Name
          <input name="name" required className="field mt-2 w-full rounded-xl p-3" placeholder="Your name"/>
        </label>
        <label className="text-sm text-primary">
          Email
          <input name="email" required type="email" className="field mt-2 w-full rounded-xl p-3" placeholder="you@example.com"/>
        </label>
      </div>
      
      <label className="mt-4 block text-sm text-primary">
        Category
        <select name="category" className="field mt-2 w-full rounded-xl p-3" defaultValue="support">
          <option value="support">Product support</option>
          <option value="feedback">Feature request or feedback</option>
          <option value="bug">Bug report</option>
          <option value="business">Business or school inquiry</option>
        </select>
      </label>
      
      <label className="mt-4 block text-sm text-primary">
        Message
        <textarea name="message" required className="field mt-2 min-h-32 w-full rounded-xl p-3" placeholder="Tell us how we can help."/>
      </label>
      
      <button 
        type="submit" 
        disabled={pending}
        className="btn btn-brand mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-50"
      >
        {pending ? "Sending..." : (
          <>Send message <ArrowRight size={17}/></>
        )}
      </button>
      
      <p className="mt-3 flex gap-2 text-xs leading-5 text-muted">
        <LockKeyhole size={14} className="mt-0.5 shrink-0"/>
        Only share information relevant to your request. We use it to respond and improve support.
      </p>
    </form>
  );
}
