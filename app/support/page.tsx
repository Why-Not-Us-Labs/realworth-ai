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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Support &amp; Help Center</h1>
        <p className="text-slate-500 mb-4">
          Welcome to the RealWorth.ai Help Center. We&apos;re here to help you get the most out of your treasure-hunting experience.
        </p>
        <p className="text-slate-600 mb-8 font-medium">
          RealWorth.ai is a product of Why Not Us Labs LLC.
        </p>

        {/* Important Notice */}
        <section className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Important Notice About Appraisals</h2>
          <p className="text-slate-700">
            <strong>RealWorth.ai provides AI-generated estimates for informational purposes only.</strong> Our valuations
            are NOT certified appraisals and should NOT be used as the sole basis for insurance, sale, legal, or financial
            decisions. For accurate valuations, please consult a qualified, licensed professional appraiser.
          </p>
        </section>

        {/* Contact Section */}
        <section className="bg-teal-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Contact Us</h2>
          <p className="text-slate-600 mb-4">
            If you need further assistance, have a feature request, or want to report a bug, please get in touch.
          </p>
          <div className="space-y-2">
            <p className="text-slate-700">
              <strong>Email Support:</strong>{' '}
              <a href="mailto:support@whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@whynotus.ai
              </a>
            </p>
            <p className="text-slate-600 text-sm">
              We aim to respond to all emails within 24-48 hours.
            </p>
            <p className="text-slate-700 mt-2">
              <strong>Website:</strong>{' '}
              <a href="https://whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                whynotus.ai
              </a>
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
                  <h4 className="font-medium text-slate-700 mb-1">Q: How do I get an appraisal?</h4>
                  <p className="text-slate-600 text-sm">
                    A: It&apos;s simple! Tap the camera icon on the main screen, snap a clear photo of your item, and our AI will
                    do the rest. You&apos;ll get an identification, estimated valuation, and detailed rationale in seconds.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: What kind of items can I appraise?</h4>
                  <p className="text-slate-600 text-sm">
                    A: You can appraise almost anything! From antiques and collectibles to electronics and furniture. For best
                    results, make sure the item is well-lit and the photo is clear.
                  </p>
                </div>
              </div>
            </div>

            {/* Appraisals & AI Chat */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Appraisals &amp; AI Chat</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: How accurate are the appraisals?</h4>
                  <p className="text-slate-600 text-sm mb-2">
                    A: Our AI provides <strong>estimated market values</strong> based on analysis of available market data and
                    recent sales. We continuously train and update our models to provide the most consistent and fair estimates possible.
                  </p>
                  <p className="text-slate-600 text-sm mb-2"><strong>However, please understand:</strong></p>
                  <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 ml-4">
                    <li>Our estimates are for <strong>informational and entertainment purposes only</strong></li>
                    <li>Actual market value may be higher or lower than our estimate</li>
                    <li>We <strong>cannot guarantee</strong> the accuracy of any valuation</li>
                    <li>For insurance, estate planning, sales, or legal purposes, <strong>you should always consult a certified professional appraiser</strong> who can physically inspect your item</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: Why might the estimate be different from what I expected?</h4>
                  <p className="text-slate-600 text-sm mb-2">
                    A: Several factors can affect value that our AI cannot fully assess from photos alone:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 ml-4">
                    <li>Physical condition (wear, damage, repairs)</li>
                    <li>Authenticity and provenance</li>
                    <li>Regional market variations</li>
                    <li>Current demand and trends</li>
                    <li>Rarity of specific variations</li>
                  </ul>
                  <p className="text-slate-600 text-sm mt-2">
                    A professional appraiser can assess these factors in person for a more accurate valuation.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: What does the AI chat do?</h4>
                  <p className="text-slate-600 text-sm">
                    A: The AI chat lets you ask follow-up questions about your item. You can ask things like &quot;What makes this
                    valuable?&quot; or &quot;Are there different versions of this?&quot; to get deeper insights into your item&apos;s history
                    and characteristics.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: Can I use RealWorth.ai estimates for insurance?</h4>
                  <p className="text-slate-600 text-sm">
                    A: Our estimates are for informational purposes only and are <strong>not certified appraisals</strong>.
                    Insurance companies typically require certified appraisals from licensed professionals. We recommend using
                    RealWorth.ai as a starting point to identify potentially valuable items, then consulting a professional
                    appraiser for items you wish to insure.
                  </p>
                </div>
              </div>
            </div>

            {/* Account & Subscription */}
            <div className="border-b border-slate-200 pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Account &amp; Subscription</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: What do I get with a RealWorth PRO subscription?</h4>
                  <p className="text-slate-600 text-sm">
                    A: RealWorth PRO gives you unlimited appraisals, full access to the conversational AI chat, and access to
                    all premium features, including advanced collection management and future marketplace features.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: How do I manage my subscription?</h4>
                  <p className="text-slate-600 text-sm">
                    A: You can manage your subscription directly through your Apple App Store or Google Play Store account settings.
                    From there, you can change or cancel your plan. For subscriptions made on our website, you can manage them
                    through your account settings at realworth.ai.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: How do I delete my account?</h4>
                  <p className="text-slate-600 text-sm">
                    A: We&apos;re sad to see you go! You can delete your account and all your data by going to Settings &gt; Account &gt;
                    Delete Account within the app. You can also email us at{' '}
                    <a href="mailto:support@whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                      support@whynotus.ai
                    </a>{' '}
                    to request deletion.
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="pb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Troubleshooting</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: My photo upload is failing. What should I do?</h4>
                  <p className="text-slate-600 text-sm">
                    A: Please check your internet connection. If the problem persists, try taking a photo in a better-lit area.
                    If you&apos;re still having trouble, contact us at{' '}
                    <a href="mailto:support@whynotus.ai" className="text-teal-600 hover:text-teal-700 underline">
                      support@whynotus.ai
                    </a>.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Q: The appraisal seems wrong. What can I do?</h4>
                  <p className="text-slate-600 text-sm mb-2">
                    A: While our AI is continuously improving, no AI system is perfect. You can try:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 ml-4">
                    <li>Taking another photo from a different angle or with better lighting</li>
                    <li>Using the AI chat to ask clarifying questions</li>
                    <li>Providing more details about the item</li>
                  </ul>
                  <p className="text-slate-600 text-sm mt-2">
                    Remember, for important valuations, we always recommend consulting a professional appraiser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Guides */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Feature Guides</h2>
          <ul className="list-disc list-inside text-slate-600 space-y-2">
            <li><strong>Collections:</strong> Organize your appraised items into collections like &quot;Mom&apos;s Jewelry&quot; or &quot;Garage Sale Finds&quot; to keep track of your treasures.</li>
            <li><strong>Discover Feed:</strong> See what other users are finding! The Discover feed shows a real-time stream of interesting and valuable items from the community.</li>
            <li><strong>Leaderboard:</strong> See how your collection&apos;s estimated value stacks up against other users. Climb the ranks by finding more treasures!</li>
          </ul>
        </section>

        {/* Legal Links */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Legal</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/privacy" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Privacy Policy</h3>
              <p className="text-slate-500 text-sm">Learn how we collect and protect your data</p>
            </Link>
            <Link href="/terms" className="block p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors">
              <h3 className="font-medium text-slate-800 mb-1">Terms of Service</h3>
              <p className="text-slate-500 text-sm">Our terms and conditions for using RealWorth</p>
            </Link>
          </div>
        </section>

        {/* Company Info */}
        <section className="text-center pt-8 border-t border-slate-200">
          <p className="text-slate-600 font-medium">Why Not Us Labs LLC</p>
          <p className="text-slate-500 text-sm">RealWorth.ai is a product of Why Not Us Labs LLC.</p>
          <p className="text-slate-400 text-sm mt-2">Thank you for using RealWorth.ai!</p>
        </section>
      </main>

      <Footer />
    </>
  );
}
