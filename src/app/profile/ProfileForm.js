"use client";

import { inputClassName } from "@/components/auth/auth-styles";
import ProgramSelect from "@/components/ui/ProgramSelect";
import { useActionState, useRef, useState } from "react";

const initialState = { error: "", success: "" };

export default function ProfileForm({
  defaultDisplayName,
  defaultIbProgram,
  currentAvatarUrl,
  googleAvatarUrl,
  displayName,
  updateProfile,
}) {
  const [state, formAction, pending] = useActionState(
    async (_prevState, formData) => updateProfile(formData),
    initialState
  );

  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(currentAvatarUrl || googleAvatarUrl || null);
  const [avatarDataUrl, setAvatarDataUrl] = useState(currentAvatarUrl || "");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 150; // 150x150 is perfect for avatars
        canvas.width = size;
        canvas.height = size;

        // Center crop and draw
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        setAvatarPreview(compressed);
        setAvatarDataUrl(compressed);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setAvatarPreview(googleAvatarUrl || null);
    setAvatarDataUrl(""); // Empty string tells the server to clear the custom avatar
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden input carries the avatar data URL into the parent <form> */}
      <input type="hidden" name="avatar_url" value={avatarDataUrl} />

      {/* Profile Picture Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center w-16 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-800 text-xl font-semibold text-gray-700 dark:text-gray-200 overflow-hidden shrink-0">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
          <p className="text-sm font-medium text-gray-900 dark:text-white text-center sm:text-left">
            Profile picture
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              Upload Photo
            </button>
            {avatarDataUrl && (
              <button
                type="button"
                disabled={pending}
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                Remove Photo
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="display_name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          minLength={2}
          maxLength={50}
          defaultValue={defaultDisplayName}
          disabled={pending}
          className={inputClassName}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          IB Programme
        </label>
        <ProgramSelect
          name="ib_program"
          defaultValue={defaultIbProgram}
          disabled={pending}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
