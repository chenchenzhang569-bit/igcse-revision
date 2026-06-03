"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <span className="text-7xl mb-4">😵</span>
      <h1 className="text-2xl font-bold text-primary-900 mb-2">Something went wrong</h1>
      <p className="text-gray-500 mb-6 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
      >
        Try Again
      </button>
    </div>
  );
}
