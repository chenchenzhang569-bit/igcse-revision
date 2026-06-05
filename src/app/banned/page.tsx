export default function BannedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-primary-900 mb-3">Account Disabled</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your account has been disabled due to suspicious activity (account sharing detected).<br />
          <span className="text-gray-400 text-xs">For appeals, contact: support@igmaster.com</span>
        </p>
        <a
          href="mailto:support@igmaster.org"
          className="inline-block bg-accent-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-accent-600 transition"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
