import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] bg-black p-4">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Search size={32} className="text-white/40" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Room Not Found</h2>
      <p className="text-white/50 mb-8 max-w-sm text-center">
        The room you are looking for does not exist or may have been deleted.
      </p>
      <Link 
        href="/dashboard/community"
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
      >
        Back to Community
      </Link>
    </div>
  );
}
