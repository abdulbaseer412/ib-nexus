export function FormMessage({ type, message, action }) {
  if (!message) return null;

  const styles =
    type === "error"
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
      : "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900";

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`text-sm px-3 py-3 rounded-xl border ${styles}`}
    >
      <p className="text-center">{message}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export default FormMessage;
