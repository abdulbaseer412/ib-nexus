"use client";

import { useState, useRef, useEffect } from "react";
import { PRESET_AVATARS } from "@/lib/avatars";
import { Check, Upload, Loader2, Sparkles, Trash2 } from "lucide-react";

export function AvatarPicker({
  value,
  onChange,
  uploadedAvatars: externalUploadedAvatars = null,
  onUploadedAvatarsChange = null
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Local storage key for persistent custom avatars
  const STORAGE_KEY = "ibnexus_uploaded_avatars";

  // State for all uploaded custom avatar URLs
  const [internalUploadedAvatars, setInternalUploadedAvatars] = useState(() => {
    if (Array.isArray(externalUploadedAvatars) && externalUploadedAvatars.length > 0) {
      return externalUploadedAvatars;
    }
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const activeUploadedAvatars = externalUploadedAvatars !== null ? externalUploadedAvatars : internalUploadedAvatars;

  // Sync if value is a custom image not yet in the uploaded list
  useEffect(() => {
    if (!value) return;
    const isCustom = value.startsWith("http") || value.startsWith("data:") || value.startsWith("/");
    if (isCustom && !activeUploadedAvatars.includes(value)) {
      const updated = [value, ...activeUploadedAvatars];
      if (onUploadedAvatarsChange) {
        onUploadedAvatarsChange(updated);
      } else {
        setInternalUploadedAvatars(updated);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  }, [value, activeUploadedAvatars, onUploadedAvatarsChange]);

  const updateUploadedList = (newList) => {
    if (onUploadedAvatarsChange) {
      onUploadedAvatarsChange(newList);
    } else {
      setInternalUploadedAvatars(newList);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      let finalUrl = null;
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/resources/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data?.url) {
          finalUrl = data.url;
        }
      } catch {
        // Fallback to data URL
      }

      if (!finalUrl) {
        finalUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        const filtered = activeUploadedAvatars.filter((url) => url !== finalUrl);
        const updated = [finalUrl, ...filtered];
        updateUploadedList(updated);
        onChange(finalUrl);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCustomAvatar = (urlToRemove, e) => {
    e.stopPropagation();
    const updated = activeUploadedAvatars.filter((u) => u !== urlToRemove);
    updateUploadedList(updated);

    // If the active avatar was the one removed, fallback to the first preset or next custom image
    if (value === urlToRemove) {
      if (updated.length > 0) {
        onChange(updated[0]);
      } else {
        onChange("fox");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid of Avatars */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {/* Preset Avatars */}
        {PRESET_AVATARS.map((preset) => {
          const isSelected = value === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`
                relative group flex items-center justify-center aspect-square rounded-2xl text-2xl sm:text-3xl
                bg-gradient-to-br ${preset.color}
                transition-all duration-200
                ${isSelected
                  ? "ring-2 ring-offset-2 ring-offset-[var(--background)] ring-[var(--accent)] scale-105 shadow-lg shadow-[var(--accent)]/20"
                  : "ring-1 ring-white/10 hover:scale-105 hover:shadow-md interactive-hover interactive-press-subtle"
                }
              `}
              title={preset.name}
            >
              <span className="relative z-10 filter drop-shadow-sm">{preset.emoji}</span>

              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-[var(--accent)] text-white rounded-full p-0.5 shadow-sm z-20 animate-in zoom-in duration-200">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
            </button>
          );
        })}

        {/* Uploaded / Saved Custom Avatars (Always preserved and displayed) */}
        {activeUploadedAvatars.map((url, index) => {
          const isSelected = value === url;

          return (
            <div
              key={`custom-avatar-${index}`}
              onClick={() => onChange(url)}
              className={`
                relative group flex items-center justify-center aspect-square rounded-2xl overflow-hidden cursor-pointer
                transition-all duration-200 bg-[var(--surface-alt)] border
                ${isSelected
                  ? "border-[var(--accent)] ring-2 ring-offset-2 ring-offset-[var(--background)] ring-[var(--accent)] scale-105 shadow-lg shadow-[var(--accent)]/20"
                  : "border-[var(--border)] hover:border-[var(--accent)]/60 hover:scale-105 hover:shadow-md"
                }
              `}
              title="Your uploaded photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Custom profile"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />

              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-[var(--accent)] text-white rounded-full p-0.5 shadow-sm z-20 animate-in zoom-in duration-200">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              {/* Hover Overlay with Delete Action */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={(e) => handleRemoveCustomAvatar(url, e)}
                  className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 shadow-sm transition-transform active:scale-95"
                  title="Remove this photo from library"
                  aria-label="Remove photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Upload Custom Image Button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group flex flex-col items-center justify-center aspect-square rounded-2xl
            border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]
            text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 cursor-pointer
            ${uploading ? "opacity-70 pointer-events-none" : "interactive-hover interactive-press-subtle"}
          `}
          title="Upload your personal photo"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          ) : (
            <>
              <Upload className="w-5 h-5 mb-1 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:scale-110 transition-all" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pl-0.5">
        <p className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--accent)]" />
          <span>Choose a preset avatar or your personal photos. Uploaded images are preserved in your library.</span>
        </p>
        {activeUploadedAvatars.length > 0 && (
          <span className="font-semibold text-[var(--text-secondary)]">
            {activeUploadedAvatars.length} custom {activeUploadedAvatars.length === 1 ? "photo" : "photos"} saved
          </span>
        )}
      </div>
    </div>
  );
}
