import Link from "next/link";

const PRICE_PER_SUBJECT = 299;

const plans = [
  {
    name: "Single Subject",
    price: `¥${PRICE_PER_SUBJECT}`,
    period: "One-time payment. Lifetime access.",
    features: [
      "Complete topic notes",
      "Practice questions with answers",
      "Past papers with mark schemes",
      "Mock exam downloads",
      "Free preview available",
    ],
    cta: "Choose Subject",
    href: "/subjects",
    popular: false,
  },
  {
    name: "Science Bundle",
    price: `¥${Math.floor(PRICE_PER_SUBJECT * 3 * 0.78)}`,
    period: "Physics + Chemistry + Biology",
    features: [
      "All three science subjects",
      "Full notes + questions + past papers",
      "Mock exam downloads",
      `Save ¥${Math.floor(PRICE_PER_SUBJECT * 3 * 0.22)} vs buying separately`,
      "Free preview available",
    ],
    cta: "Get Bundle",
    href: "/register",
    popular: true,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-500 text-lg">Pay per subject. No subscriptions. No hidden fees.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white border rounded-2xl p-8 ${
              plan.popular
                ? "border-primary-500 shadow-xl ring-2 ring-primary-100"
                : "hover:shadow-lg transition"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                Best Value
              </span>
            )}
            <h3 className="text-xl font-bold text-primary-900 mb-1">{plan.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{plan.period}</p>
            <p className="text-4xl font-bold text-accent-500 mb-6">{plan.price}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-accent-500 mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`block text-center py-3 rounded-xl font-semibold transition ${
                plan.popular
                  ? "bg-accent-500 text-white hover:bg-accent-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {plan.cta} →
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center mt-16 pt-12 border-t">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">Questions?</h3>
        <p className="text-gray-500">
          Preview content for free on every subject before you buy.
        </p>
      </div>
    </div>
  );
}
