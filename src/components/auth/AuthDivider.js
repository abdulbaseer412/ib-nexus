export default function AuthDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-divider" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-card text-muted">or</span>
      </div>
    </div>
  );
}
