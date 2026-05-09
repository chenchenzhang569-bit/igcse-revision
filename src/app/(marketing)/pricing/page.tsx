import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PricingPage() {
  const supabase = createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("price_cny")
    .eq("is_published", true);

  const price = subjects && subjects.length > 0 ? (subjects[0] as any).price_cny : 29900;
  const singlePrice = (price / 100).toFixed(0);
  const bundlePrice = Math.floor((price * 3 * 0.78) / 100); // ~22% discount

  const plans = [
    {
      name: "单科永久",
      price: `¥${singlePrice}`,
      period: "一次性付费，永久访问",
      features: [
        "完整笔记（全部主题）",
        "配套试题 + 详细答案",
        "历年真题（含评分标准）",
        "模拟试卷下载",
        "免费预览开放笔记",
      ],
      cta: "选择科目",
      href: "/subjects",
      popular: false,
    },
    {
      name: "理科套装",
      price: `¥${bundlePrice}`,
      period: "数学 + 物理 + 化学",
      features: [
        "三门科目全部内容",
        "完整笔记 + 试题 + 真题",
        "模拟试卷下载",
        `比单买省 ¥${singlePrice * 3 - bundlePrice}`,
        "免费预览开放笔记",
      ],
      cta: "立即购买",
      href: "/register",
      popular: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">简单透明的定价</h1>
        <p className="text-gray-500 text-lg">按需购买，无隐藏费用</p>
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
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                最受欢迎
              </span>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{plan.period}</p>
            <p className="text-4xl font-bold text-primary-600 mb-6">{plan.price}</p>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`block text-center py-3 rounded-xl font-semibold transition ${
                plan.popular
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {plan.cta} →
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center mt-16 pt-12 border-t">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">有疑问？</h3>
        <p className="text-gray-500">
          所有科目均可免费预览部分内容，满意后再购买。
        </p>
      </div>
    </div>
  );
}
