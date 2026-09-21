import NexusLoadingState from "@/components/ui/NexusLoadingState";

export default function Loading() {
  return (
    <main className="surface min-h-[calc(100vh-72px)] flex items-center justify-center">
      <NexusLoadingState state="loading" message="Loading..." />
    </main>
  );
}
