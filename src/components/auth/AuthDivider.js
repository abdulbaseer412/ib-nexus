export default function AuthDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-800" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-white dark:bg-black text-gray-400">or</span>
      </div>
    </div>
  );
}
