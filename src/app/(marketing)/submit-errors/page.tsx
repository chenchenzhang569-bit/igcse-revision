export default function SubmitErrorsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">Submit Errors</h1>
        <p className="text-gray-500">
          Found a mistake? Let us know and we&apos;ll fix it ASAP.
        </p>
      </div>

      <form className="space-y-5 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
          <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition">
            <option>Physics</option>
            <option>Chemistry</option>
            <option>Biology</option>
            <option>Mathematics</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Topic / Page</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="e.g. Physics 1.1 — Forces"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="Describe what&apos;s wrong..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
}
