import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <span className="text-7xl mb-4">🔍</span>
      <h1 className="text-2xl font-bold text-primary-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-6 text-center max-w-md">
        Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
