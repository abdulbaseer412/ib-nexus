import { PRESET_AVATARS } from "@/lib/avatars";

export function Avatar({ url, name, size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-16 h-16 text-3xl",
  };

  const selectedPreset = PRESET_AVATARS.find(a => a.id === url);

  if (selectedPreset) {
    return (
      <div 
        className={`shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br ${selectedPreset.color} ${sizeClasses[size]} ${className}`}
        title={name}
      >
        {selectedPreset.emoji}
      </div>
    );
  }

  if (url && url.startsWith("http")) {
    return (
      <img 
        src={url} 
        alt={name || ""} 
        className={`shrink-0 rounded-full object-cover ${sizeClasses[size]} ${className}`} 
        title={name}
      />
    );
  }

  // Fallback to initial
  return (
    <div 
      className={`shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/50 ${sizeClasses[size]} border border-white/5 ${className}`}
      title={name}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
