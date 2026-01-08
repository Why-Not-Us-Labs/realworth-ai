import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Support | RealWorth.ai',
  description: 'Get help with RealWorth.ai - FAQs, contact information, and support resources.',
};

export default function SupportPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Support Center</h1>
        <p className="text-slate-500 mb-8">We&apos;re here to help you get the most out of RealWorth.ai</p>

        {/* Contact Section */}
        <section className="bg-teal-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Contact Us</h2>
          <p className="text-slate-600 mb-4">
            Have a question or need assistance? Reach out to our support team:
          </p>
          <div className="space-y-2">
            <p className="text-slate-700">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>
            </p>
            <p className="text-slate-600 text-sm">
              We typically respond within 24 hours on business days.
            </p>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {/* Getting Started */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Getting Started</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How do I create an account?</h4>
                  <p className="text-slate-600 text-sm">
                    Tap &quot;Get Started&quot; and sign in with your Google or Apple account. We use secure OAuth
                    authentication, so you don&apos;t need to create a separate password.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How does the appraisal work?</h4>
                  <p className="text-slate-600 text-sm">
                    Simply take a photo of your item or upload an existing image. Our AI analyzes the item,
                    identifies what it is, and provides a market value estimate based on current pricing data
                    and comparable sales.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">What items can RealWorth appraise?</h4>
                  <p className="text-slate-600 text-sm">
                    RealWorth can appraise a wide variety of items including antiques, collectibles, vintage items,
                    books, art, furniture, jewelry, electronics, toys, and more. For best results, take clear,
                    well-lit photos showing the item&apos;s details and any maker&apos;s marks.
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Subscription & Billing</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">What&apos;s included in the free tier?</h4>
                  <p className="text-slate-600 text-sm">
                    Free users get 2 appraisals per month. This resets automatically each month.
                    You can view your appraisal history and share results anytime.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">What does RealWorth PRO include?</h4>
                  <p className="text-slate-600 text-sm">
                    PRO subscribers get unlimited appraisals, full access to the AI chat feature for follow-up
                    questions, priority processing, and all premium features as they&apos;re released.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How much does PRO cost?</h4>
                  <p className="text-slate-600 text-sm">
                    RealWorth PRO is $19.99/month or $149.99/year (save over 35% annually).
                    Prices may vary by region and platform.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How do I cancel my subscription?</h4>
                  <p className="text-slate-600 text-sm">
                    <strong>Web subscriptions:</strong> Go to your Profile, tap &quot;Manage Subscription&quot;, and you&apos;ll
                    be taken to Stripe&apos;s customer portal where you can cancel.
                    <br />
                    <strong>iOS subscriptions:</strong> Go to Settings &gt; Apple ID &gt; Subscriptions on your device
                    and manage your RealWorth subscription there.
                    <br />
                    Your PRO access continues until the end of your current billing period.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Can I get a refund?</h4>
                  <p className="text-slate-600 text-sm">
                    <strong>Web subscriptions:</strong> Contact us at support@realworth.ai within 7 days of your
                    purchase and we&apos;ll process a refund.
                    <br />
                    <strong>iOS subscriptions:</strong> Refunds are handled by Apple. You can request a refund
                    through Apple&apos;s{' '}
                    <a href="https://reportaproblem.apple.com" className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">
                      Report a Problem
                    </a>{' '}
                    page.
                  </p>
                </div>
              </div>
            </div>

            {/* Using the App */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Using RealWorth</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How accurate are the appraisals?</h4>
                  <p className="text-slate-600 text-sm">
                    Our AI provides estimates based on current market data and comparable sales. While we strive
                    for accuracy, appraisals are for informational purposes only. For high-value items or insurance
                    purposes, we recommend consulting a certified appraiser.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Can I chat with the AI about my item?</h4>
                  <p className="text-slate-600 text-sm">
                    Yes! PRO subscribers can ask follow-up questions like &quot;Would this be worth more in better
                    condition?&quot; or &quot;Where could I sell this?&quot; The AI provides detailed insights based on your
                    specific item.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Where are my appraisals saved?</h4>
                  <p className="text-slate-600 text-sm">
                    All your appraisals are automatically saved to your account. Access them anytime from the
                    Treasures tab in the app or on our website.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Can I share my appraisals?</h4>
                  <p className="text-slate-600 text-sm">
                    Yes! Each appraisal has a unique shareable link. Tap the share button on any appraisal to
                    copy the link or share directly to social media.
                  </p>
                </div>
              </div>
            </div>

            {/* Account & Privacy */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Account & Privacy</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">How do I delete my account?</h4>
                  <p className="text-slate-600 text-sm">
                    Contact us at support@realworth.ai with the subject line &quot;Delete Account&quot; and include the
                    email address associated with your account. We&apos;ll process your request within 30 days.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Is my data secure?</h4>
                  <p className="text-slate-600 text-sm">
                    Yes. We use industry-standard encryption, secure OAuth authentication (no passwords stored),
                    and your data is protected by Row Level Security in our database. See our{' '}
                    <Link href="/privacy" className="text-teal-600 hover:text-teal-700 underline">
                      Privacy Policy
                    </Link>{' '}
                    for details.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Do you sell my data?</h4>
                  <p className="text-slate-600 text-sm">
                    No. We do not sell your personal information. See our{' '}
                    <Link href="/privacy" className="text-teal-600 hover:text-teal-700 underline">
                      Privacy Policy
                    </Link>{' '}
                    for full details on how we handle your data.
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Troubleshooting</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">The app is running slowly or crashing</h4>
                  <p className="text-slate-600 text-sm">
                    Try closing and reopening the app. If the issue persists, make sure you have the latest
                    version installed. Still having trouble? Contact us with your device model and OS version.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">My appraisal seems incorrect</h4>
                  <p className="text-slate-600 text-sm">
                    For best results, ensure your photo is clear, well-lit, and shows any important details
                    (maker&apos;s marks, signatures, condition issues). If you have PRO, use the chat feature to
                    provide additional context. Values can vary based on condition, provenance, and market trends.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">I can&apos;t sign in</h4>
                  <p className="text-slate-600 text-sm">
                    Make sure you&apos;re using the same sign-in method (Google or Apple) you originally used to
                    create your account. If you&apos;re still having trouble, contact us with your email address
                    and we&apos;ll help you recover access.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">My subscription isn&apos;t showing as active</h4>
                  <p className="text-slate-600 text-sm">
                    Try signing out and back in to refresh your account status. For iOS subscriptions, make sure
                    you&apos;re signed in with the same Apple ID used for the purchase. If the issue persists, contact
                    us with your account email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Additional Resources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/privacy" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Privacy Policy</h3>
              <p className="text-slate-500 text-sm">Learn how we collect and protect your data</p>
            </Link>
            <Link href="/terms" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Terms of Service</h3>
              <p className="text-slate-500 text-sm">Our terms and conditions for using RealWorth</p>
            </Link>
            <Link href="/disclaimer" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Disclaimer</h3>
              <p className="text-slate-500 text-sm">Important information about appraisal accuracy</p>
            </Link>
            <a href="mailto:support@realworth.ai" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Email Support</h3>
              <p className="text-slate-500 text-sm">Get help from our team directly</p>
            </a>
          </div>
        </section>

        {/* App Version Info */}
        <section className="text-center text-slate-500 text-sm">
          <p>RealWorth.ai</p>
          <p>Made with care in San Francisco</p>
        </section>
      </main>

      <Footer />
    </>
  );
}
