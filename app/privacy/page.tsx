import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | RealWorth.ai',
  description: 'Privacy Policy for RealWorth.ai - Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-teal-600 hover:text-teal-700">
            RealWorth.ai
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: January 7, 2026</p>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Welcome to RealWorth.ai. Your privacy is critically important to us. This Privacy Policy outlines how
            Why Not Us Labs LLC, doing business as RealWorth.ai (&quot;Why Not Us Labs,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            collects, uses, shares, and protects your information when you use our website (realworth.ai) and our
            mobile application (the &quot;Service&quot;).
          </p>

          <p className="text-slate-600 mb-6 font-medium">
            RealWorth.ai is a product of Why Not Us Labs LLC.
          </p>

          <p className="text-slate-600 mb-8">
            By using our Service, you agree to the collection and use of information in accordance with this policy.
            Please read this policy carefully.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Information We Collect</h2>
            <p className="text-slate-600 mb-4">
              We collect several types of information to provide and improve our Service to you.
            </p>

            <h3 className="text-lg font-medium text-slate-700 mb-2">A. Information You Provide to Us</h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password.</li>
              <li><strong>User Content (Your &quot;Treasures&quot;):</strong> We collect the photos you upload and any descriptions or notes you add about your items. This is the core of our Service.</li>
              <li><strong>Communications:</strong> If you contact us for support, we collect the information you provide in your communications.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">B. Information We Collect Automatically</h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Usage Data:</strong> We may collect information on how the Service is accessed and used, such as your device&apos;s IP address, browser type, pages visited, and the time and date of your visit.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">C. Information from Third-Party Services</h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Payment Information:</strong> If you subscribe to RealWorth PRO, your payment information is processed by our third-party payment processor, <strong>Stripe</strong>. We do not store your credit card details. We only receive a token to confirm your payment status. You can view Stripe&apos;s privacy policy at stripe.com/privacy.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">We use the collected data for various purposes:</p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>To provide and maintain our Service.</li>
              <li>To perform the core function of the app: appraising your items.</li>
              <li>To manage your account and provide you with customer support.</li>
              <li>To process your subscriptions and payments.</li>
              <li>To notify you about changes to our Service.</li>
              <li>To improve our Service and develop new features.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Data Sharing with Third Parties</h2>
            <p className="text-slate-600 mb-4">
              We do not sell your personal data. However, we share information with specific third parties to operate our Service.
            </p>

            <h3 className="text-lg font-medium text-slate-700 mb-2">A. Third-Party AI for Appraisals (IMPORTANT)</h3>
            <p className="text-slate-600 mb-4">
              To provide our core appraisal service, we use a third-party Artificial Intelligence (AI) model,
              <strong> Google&apos;s Gemini</strong>, to analyze the photos you upload.
            </p>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
              <p className="text-slate-700 font-medium">
                By using our appraisal feature, you explicitly consent to your uploaded photos and any related text
                being sent to Google for processing.
              </p>
            </div>

            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>What is shared:</strong> The images of your items and any text you provide are sent to Google&apos;s Gemini AI for analysis.</li>
              <li><strong>What is NOT shared:</strong> We do not send your personal account information (name, email) with the images.</li>
              <li><strong>Purpose:</strong> This sharing is strictly for the purpose of identifying and valuing your item.</li>
              <li><strong>Google&apos;s Use:</strong> Google may use this data to improve its services. We encourage you to review Google&apos;s Privacy Policy at policies.google.com/privacy.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">B. Other Third Parties</h3>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Payment Processing:</strong> As mentioned, we use <strong>Stripe</strong> for payment processing.</li>
              <li><strong>Analytics:</strong> We may use third-party services like Google Analytics to monitor and analyze the use of our Service. These services may collect data about your usage.</li>
            </ul>

            <p className="text-slate-600 mb-4">
              We ensure that any third party with whom we share user data provides the same or equal protection of user data
              as stated in this privacy policy and required by the Apple App Store guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Your Rights and Choices</h2>
            <p className="text-slate-600 mb-4">
              You have rights over your personal data. We provide you with the tools to exercise them.
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Access and Update:</strong> You can review and update your account information at any time through your account settings.</li>
              <li><strong>Data Deletion:</strong> You can delete individual items from your collection at any time. To permanently delete your entire account and all associated data, please follow the steps below.</li>
              <li><strong>Account Deletion:</strong> You can request the deletion of your account and all associated personal data from within the app or by emailing us at <strong>support@whynotus.ai</strong>. We will process your request within 30 days.</li>
              <li><strong>Revoke Consent:</strong> You can revoke your consent for data collection and processing at any time by deleting your account. To revoke consent for AI processing, simply stop using the appraisal feature.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Data Retention</h2>
            <p className="text-slate-600 mb-4">
              We retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy.
              We will retain your data to the extent necessary to comply with our legal obligations (for example, if we are
              required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.
            </p>
            <p className="text-slate-600 mb-4">
              When you delete your account, we will permanently delete your personal information from our systems within a reasonable timeframe.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Data Security</h2>
            <p className="text-slate-600 mb-4">
              The security of your data is important to us. We use commercially acceptable means to protect your personal data,
              but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
              While we strive to use the best security practices, we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Children&apos;s Privacy</h2>
            <p className="text-slate-600 mb-4">
              Our Service is not intended for use by children under the age of 13. We do not knowingly collect personally
              identifiable information from children under 13. If you are a parent or guardian and you are aware that your
              child has provided us with personal data, please contact us. If we become aware that we have collected personal
              data from children without verification of parental consent, we take steps to remove that information from our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Changes to This Privacy Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy
              periodically for any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none text-slate-600 mb-4 space-y-1">
              <li><strong>By email:</strong>{' '}
                <a href="mailto:support@whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                  support@whynotus.ai
                </a>
              </li>
              <li><strong>By visiting our website:</strong>{' '}
                <a href="https://whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                  whynotus.ai
                </a>
              </li>
            </ul>
          </section>

          <section className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-slate-600 font-medium">
              Why Not Us Labs LLC
            </p>
            <p className="text-slate-500 text-sm">
              RealWorth.ai is a product of Why Not Us Labs LLC.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
