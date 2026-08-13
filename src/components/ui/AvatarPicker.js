"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Upload, Loader2, X } from "lucide-react";
import { PRESET_AVATARS } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/browser";
import { Avatar } from "./index";

export function AvatarPicker({ value, onChange, onConfirm }) {
  const [isUploading, setIsUploading] = useState(false);
  const [customAvatars, setCustomAvatars] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          await fetchCustomAvatars(user.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingAvatars(false);
      }
    }
    init();
  }, []);

  const fetchCustomAvatars = async (uid) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('avatars').list(uid);
    if (!error && data) {
      // Filter out system placeholders and map to URLs
      const files = data.filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`${uid}/${file.name}`);
        return { name: file.name, url: publicUrl };
      });
      setCustomAvatars(files);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Max size is 2MB.");
      return;
    }

    try {
      setIsUploading(true);
      const supabase = createClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await fetchCustomAvatars(userId); // Refresh custom avatars list
      
      // Auto-select the newly uploaded file
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      onChange(publicUrl);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert("Failed to upload avatar. Please make sure the 'avatars' storage bucket is created.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (e, fileName) => {
    e.stopPropagation();
    if (!userId || !confirm("Are you sure you want to delete this uploaded avatar?")) return;
    try {
      const supabase = createClient();
      await supabase.storage.from('avatars').remove([`${userId}/${fileName}`]);
      await fetchCustomAvatars(userId);
      
      const deletedUrl = supabase.storage.from('avatars').getPublicUrl(`${userId}/${fileName}`).data.publicUrl;
      if (value === deletedUrl) onChange("fox"); // fallback to a preset if deleted
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    setIsApplying(true);
    try {
      await onConfirm();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory items-center">
          
          {/* Custom Upload Button */}
          <div className="shrink-0 snap-center relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoadingAvatars}
              className={`relative shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-out border-2 border-dashed border-white/20 bg-white/5 hover:border-indigo-400 hover:bg-white/10`}
            >
              {isUploading ? (
                <Loader2 size={24} className="text-white/50 animate-spin" />
              ) : (
                <>
                  <Upload size={20} className="text-white/50 mb-1" />
                  <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Upload</span>
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="w-px h-10 bg-white/10 shrink-0 mx-1"></div>

          {/* Custom Avatars List */}
          {customAvatars.map((file) => (
             <div key={file.name} className="shrink-0 snap-center relative group/item">
               <button
                 type="button"
                 onClick={() => onChange(file.url)}
                 className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ease-out border-2 ${value === file.url ? "border-indigo-500 bg-[var(--surface)] ring-4 ring-indigo-500/30 scale-110 shadow-xl" : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"}`}
               >
                 <Avatar url={file.url} size="xl" className="w-full h-full rounded-full" />
                 {value === file.url && (
                   <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full border-2 border-black flex items-center justify-center z-10">
                     <Check size={12} className="text-white" />
                   </div>
                 )}
               </button>
               {/* Delete Button */}
               <button 
                 type="button"
                 onClick={(e) => handleDelete(e, file.name)}
                 className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-20 shadow-sm hover:scale-110"
                 title="Delete Avatar"
               >
                 <X size={12} strokeWidth={3} />
               </button>
             </div>
          ))}

          {customAvatars.length > 0 && <div className="w-px h-10 bg-white/10 shrink-0 mx-1"></div>}

          {/* Presets */}
          {PRESET_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onChange(avatar.id)}
              className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl snap-center transition-all duration-300 ease-out bg-gradient-to-br ${avatar.color} ${value === avatar.id ? "ring-4 ring-indigo-500 scale-110 shadow-xl" : "opacity-70 hover:opacity-100 hover:scale-105 saturate-50 hover:saturate-100"}`}
            >
              {avatar.emoji}
              {value === avatar.id && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full border-2 border-black flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {onConfirm && (
        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={isApplying}
            className="btn w-full justify-center bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 transition-all font-medium py-2.5 rounded-xl disabled:opacity-50"
          >
            {isApplying ? "Applying..." : "Confirm & Apply Avatar"}
          </button>
        </div>
      )}
    </div>
  );
}
