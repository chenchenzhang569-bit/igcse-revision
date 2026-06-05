import Link from "next/link";

export const revalidate = 86400;

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-primary-900 mb-8">Disclaimer</h1>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-primary-900">1. Educational Purpose</h2>
          <p>
            IGMaster is an independent educational platform designed to help students prepare for IGCSE examinations. All content on this website is provided for <strong>personal study and revision purposes only</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">2. Copyright & Intellectual Property</h2>
          <p>
            Cambridge Assessment International Education (CAIE) and Pearson Edexcel are the respective owners of IGCSE syllabuses and official examination materials. Third-party educational websites retain copyright over their original materials.
          </p>
          <p>
            IGMaster does not claim ownership of third-party content. Where we reference or adapt materials from external sources, we do so under the principle of <strong>fair use for educational purposes</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">3. Content Sources</h2>
          <p>
            Our question bank and revision materials are compiled from various publicly available educational resources. We adapt and organise this content to provide a structured revision experience for students.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">4. Takedown Requests</h2>
          <p>
            If you are a copyright holder and believe that any content on IGMaster infringes your rights, please contact us immediately at{" "}
            <a href="mailto:support@igmaster.org" className="text-primary-600 underline">support@igmaster.org</a>.
            We will review your request promptly and remove the disputed content within 7 business days where appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">5. Accuracy Disclaimer</h2>
          <p>
            While we strive to ensure the accuracy of all content, IGMaster makes no warranties regarding the completeness or correctness of study materials. Students should always cross-reference with official CAIE / Edexcel syllabuses and past papers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">6. No Affiliation</h2>
          <p>
            IGMaster is <strong>not affiliated with, endorsed by, or sponsored by</strong> Cambridge Assessment International Education, Pearson Edexcel, or any other third-party organisation referenced on this site. All trademarks belong to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary-900">7. Contact</h2>
          <p>
            For any legal inquiries, please reach out to{" "}
            <a href="mailto:support@igmaster.org" className="text-primary-600 underline">support@igmaster.org</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
