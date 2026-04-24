export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-[#30363d] border-t-[#00d4aa] rounded-full animate-spin" />
      <span className="text-[#8b949e] text-sm">{label}</span>
    </div>
  );
}
