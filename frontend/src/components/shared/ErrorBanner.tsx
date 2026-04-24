export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-[#3d1a1a] border border-[#f85149] text-[#f85149] rounded-lg px-4 py-3 text-sm">
      {message}
    </div>
  );
}
