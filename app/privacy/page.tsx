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
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Introduction</h2>
            <p className="text-slate-600 mb-4">
              RealWorth.ai (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the RealWorth.ai website and mobile application
              (collectively, the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our Service, whether accessed via web browser or mobile application.
            </p>
            <p className="text-slate-600 mb-4">
              By using our Service, you agree to the collection and use of information in accordance with this policy.
              If you do not agree with our policies, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-slate-700 mb-2">Account Information</h3>
            <p className="text-slate-600 mb-4">
              When you sign in using Google OAuth or Apple Sign-In, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Your name (as provided by the authentication provider)</li>
              <li>Email address</li>
              <li>Profile picture URL (if available)</li>
              <li>Unique account identifier from the authentication provider</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">User Content</h3>
            <p className="text-slate-600 mb-4">
              When you use our appraisal service, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Images you upload for appraisal</li>
              <li>Appraisal results and history</li>
              <li>Collections and organization data you create</li>
              <li>Chat conversations with our AI assistant (Pro users)</li>
              <li>Any notes or descriptions you add to items</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">Usage Information</h3>
            <p className="text-slate-600 mb-4">
              We automatically collect certain information about your device and usage:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Device type, model, and operating system version</li>
              <li>Browser type and version (for web access)</li>
              <li>IP address and general location (city/region level)</li>
              <li>Pages visited, features used, and time spent</li>
              <li>App crashes and performance data</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">Payment Information</h3>
            <p className="text-slate-600 mb-4">
              We do not directly collect or store payment card information. Payments are processed by:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Stripe:</strong> For web subscriptions (PCI-DSS Level 1 compliant)</li>
              <li><strong>Apple:</strong> For in-app purchases on iOS (via App Store)</li>
            </ul>
            <p className="text-slate-600 mb-4">
              We receive only transaction confirmations and subscription status from these providers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your appraisal requests using AI analysis</li>
              <li>Manage your account and subscription status</li>
              <li>Send you service-related communications (receipts, updates, security alerts)</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address fraud, abuse, or technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Data Storage and Security</h2>
            <p className="text-slate-600 mb-4">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Database:</strong> Supabase (PostgreSQL) with Row Level Security (RLS) ensuring users can only access their own data</li>
              <li><strong>Image Storage:</strong> Supabase Storage with authenticated access controls</li>
              <li><strong>Hosting:</strong> Vercel with SSL/TLS encryption for all data in transit</li>
              <li><strong>Authentication:</strong> OAuth 2.0 via Google and Apple (we never see or store your passwords)</li>
              <li><strong>Payments:</strong> Stripe (PCI-DSS Level 1 compliant) and Apple App Store</li>
            </ul>
            <p className="text-slate-600 mb-4">
              We implement appropriate technical and organizational measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction. However, no method of
              transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Third-Party Services</h2>
            <p className="text-slate-600 mb-4">
              We use the following third-party services that may collect or process your data:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Google:</strong> Authentication (OAuth) and AI services (Gemini) for appraisals</li>
              <li><strong>Apple:</strong> Authentication (Sign in with Apple) and payment processing (App Store)</li>
              <li><strong>Supabase:</strong> Database, authentication, and file storage</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Each of these services has their own privacy policy governing their use of your data.
              We encourage you to review their policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Data Sharing and Disclosure</h2>
            <p className="text-slate-600 mb-4">
              <strong>We do not sell your personal data.</strong> We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>With your consent:</strong> When you explicitly agree to share data</li>
              <li><strong>Service providers:</strong> Third parties who assist in operating our Service (under strict confidentiality agreements)</li>
              <li><strong>Legal compliance:</strong> To comply with applicable law, regulation, legal process, or governmental request</li>
              <li><strong>Safety and rights:</strong> To protect the safety, rights, or property of RealWorth.ai, our users, or the public</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets (you will be notified)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Your Rights and Choices</h2>
            <p className="text-slate-600 mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request your data in a portable, machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            </ul>
            <p className="text-slate-600 mb-4">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. California Privacy Rights (CCPA)</h2>
            <p className="text-slate-600 mb-4">
              If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Right to Know:</strong> You can request information about the categories and specific pieces of personal information we have collected</li>
              <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
              <li><strong>Right to Opt-Out:</strong> We do not sell personal information, so this right does not apply</li>
            </ul>
            <p className="text-slate-600 mb-4">
              To submit a request, email us at{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>{' '}
              with the subject line &quot;CCPA Request&quot;.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. International Data Transfers</h2>
            <p className="text-slate-600 mb-4">
              Your information may be transferred to and processed in countries other than your country of residence.
              These countries may have different data protection laws. When we transfer data internationally,
              we ensure appropriate safeguards are in place to protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Data Retention</h2>
            <p className="text-slate-600 mb-4">
              We retain your personal data for as long as your account is active or as needed to provide
              you with our Service. Specifically:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Account data:</strong> Retained until you delete your account</li>
              <li><strong>Appraisal history:</strong> Retained for the life of your account</li>
              <li><strong>Images:</strong> Retained until you delete them or your account</li>
              <li><strong>Payment records:</strong> Retained as required by law (typically 7 years)</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Upon account deletion, we will delete your personal data within 30 days, except where
              we are required to retain it for legal, accounting, or compliance purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Children&apos;s Privacy</h2>
            <p className="text-slate-600 mb-4">
              Our Service is not intended for children under the age of 13 (or 16 in the European Economic Area).
              We do not knowingly collect personal information from children. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us immediately
              at{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>. We will take steps to delete such information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">12. Changes to This Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices or
              applicable laws. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Posting the updated policy on this page with a new &quot;Last updated&quot; date</li>
              <li>Sending an email notification for significant changes</li>
              <li>Displaying a notice within the app</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">13. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none text-slate-600 mb-4 space-y-1">
              <li><strong>Email:</strong>{' '}
                <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                  support@realworth.ai
                </a>
              </li>
              <li><strong>Website:</strong>{' '}
                <a href="https://realworth.ai/support" className="text-teal-600 hover:text-teal-700 underline">
                  realworth.ai/support
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
