import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | RealWorth.ai',
  description: 'Terms of Service for RealWorth.ai - AI-powered item appraisals and valuations.',
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: January 7, 2026</p>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Welcome to RealWorth.ai. These Terms of Service (&quot;Terms&quot;) govern your use of the RealWorth.ai website
            and mobile application (collectively, the &quot;Service&quot;), operated by <strong>Why Not Us Labs LLC</strong>
            (&quot;Why Not Us Labs,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>

          <p className="text-slate-600 mb-6 font-medium">
            RealWorth.ai is a product of Why Not Us Labs LLC.
          </p>

          <p className="text-slate-600 mb-8">
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of
            the terms, then you may not access the Service.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Accounts</h2>
            <p className="text-slate-600 mb-4">
              When you create an account with us, you must provide us with information that is accurate, complete, and
              current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate
              termination of your account on our Service.
            </p>
            <p className="text-slate-600 mb-4">
              You are responsible for safeguarding the password that you use to access the Service and for any activities
              or actions under your password. You agree not to disclose your password to any third party. You must notify
              us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Service and Appraisals</h2>
            <p className="text-slate-600 mb-4">
              Our Service provides AI-powered appraisals of items based on images you provide. <strong>PLEASE READ THIS SECTION CAREFULLY.</strong>
            </p>

            <h3 className="text-lg font-medium text-slate-700 mb-2">A. Appraisals Are Estimates Only</h3>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-slate-800 font-semibold mb-2">IMPORTANT DISCLAIMER:</p>
              <p className="text-slate-700">
                The valuations provided by RealWorth.ai are <strong>estimates only</strong> and are provided for{' '}
                <strong>informational and entertainment purposes</strong>. They are NOT certified appraisals and should
                NOT be relied upon as the definitive value of any item.
              </p>
            </div>

            <p className="text-slate-600 mb-4">You understand and agree that:</p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
              <li><strong>Estimates, Not Guarantees:</strong> All valuations are estimates based on AI analysis of available market data. We <strong>cannot and do not guarantee</strong> that any item is worth the amount displayed. Actual market value may be significantly higher or lower than our estimate.</li>
              <li><strong>Not a Substitute for Professional Appraisal:</strong> RealWorth.ai is <strong>NOT a substitute for a professional, certified appraiser</strong>. If you need an accurate valuation for insurance, estate planning, sale, legal proceedings, tax purposes, or any other official or financial purpose, <strong>you must consult a qualified, licensed appraiser</strong>.</li>
              <li><strong>No Liability for Valuation Accuracy:</strong> We are <strong>not liable</strong> for any loss, damage, or claim arising from your reliance on our estimates. This includes, but is not limited to: selling an item for less than its actual value, insuring an item for an incorrect amount, making financial decisions based on our estimates, or any disputes arising from the use of our valuations.</li>
              <li><strong>Continuous Improvement:</strong> We continuously train and update our AI models to provide the most consistent and fair estimates based on available data. However, no AI system is perfect, and valuations can vary based on factors we cannot assess, such as condition, provenance, authenticity, and current market demand.</li>
              <li><strong>Factors We Cannot Assess:</strong> Our AI analyzes images and text you provide. It cannot physically inspect items, verify authenticity, assess condition beyond what is visible in photos, or account for regional market variations. A professional appraiser can assess these factors in person.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">B. AI Processing</h3>
            <p className="text-slate-600 mb-4">
              By using the appraisal feature, you grant us the right to use the images and text you submit to provide
              the service, which includes processing by third-party AI services as outlined in our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. User Content</h2>
            <p className="text-slate-600 mb-4">
              Our Service allows you to post, link, store, share and otherwise make available certain information, text,
              graphics, videos, or other material (&quot;User Content&quot;). You are responsible for the User Content that you post
              to the Service, including its legality, reliability, and appropriateness.
            </p>
            <p className="text-slate-600 mb-4">
              By posting User Content to the Service, you grant us the right and license to use, modify, publicly perform,
              publicly display, reproduce, and distribute such User Content on and through the Service. You retain any
              and all of your rights to any User Content you submit.
            </p>
            <p className="text-slate-600 mb-4">
              You represent and warrant that: (i) the User Content is yours (you own it) or you have the right to use it
              and grant us the rights and license as provided in these Terms, and (ii) the posting of your User Content
              on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights
              or any other rights of any person.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Subscriptions</h2>
            <p className="text-slate-600 mb-4">
              Some parts of the Service are billed on a subscription basis (&quot;Subscription(s)&quot;). You will be billed in
              advance on a recurring and periodic basis (&quot;Billing Cycle&quot;).
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Payment:</strong> Your subscription will be charged through your Apple App Store or Google Play Store account, or via our third-party payment processor Stripe on our website.</li>
              <li><strong>Renewal:</strong> At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or we cancel it.</li>
              <li><strong>Cancellation:</strong> You may cancel your Subscription renewal either through your online account management page or by contacting the respective app store&apos;s support team.</li>
              <li><strong>Fee Changes:</strong> We reserve the right to modify the Subscription fees at any time. Any fee change will become effective at the end of the then-current Billing Cycle.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Intellectual Property</h2>
            <p className="text-slate-600 mb-4">
              The Service and its original content (excluding User Content), features, and functionality are and will
              remain the exclusive property of Why Not Us Labs LLC and its licensors. The Service is protected by copyright,
              trademark, and other laws of both the United States and foreign countries.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Links To Other Web Sites</h2>
            <p className="text-slate-600 mb-4">
              Our Service may contain links to third-party web sites or services that are not owned or controlled by
              Why Not Us Labs LLC.
            </p>
            <p className="text-slate-600 mb-4">
              We have no control over, and assume no responsibility for, the content, privacy policies, or practices of
              any third-party web sites or services. You further acknowledge and agree that we shall not be responsible
              or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection
              with the use of or reliance on any such content, goods or services available on or through any such web sites or services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Limitation Of Liability</h2>
            <p className="text-slate-600 mb-4 font-medium">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
            <p className="text-slate-600 mb-4">
              In no event shall Why Not Us Labs LLC, nor its directors, employees, partners, agents, suppliers, or
              affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including
              without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>(i) your access to or use of or inability to access or use the Service;</li>
              <li>(ii) any conduct or content of any third party on the Service;</li>
              <li>(iii) any content obtained from the Service;</li>
              <li>(iv) unauthorized access, use or alteration of your transmissions or content;</li>
              <li>(v) <strong>any reliance on valuations or appraisals provided by the Service</strong>;</li>
              <li>(vi) <strong>any financial decisions made based on information provided by the Service</strong>;</li>
              <li>(vii) <strong>any difference between our estimated value and the actual sale price or insured value of any item</strong>;</li>
            </ul>
            <p className="text-slate-600 mb-4">
              whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not
              we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to
              have failed of its essential purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Disclaimer</h2>
            <p className="text-slate-600 mb-4">
              Your use of the Service is at your sole risk. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis.
              The Service is provided without warranties of any kind, whether express or implied, including, but not limited to,
              implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
            </p>
            <p className="text-slate-600 mb-4">Why Not Us Labs LLC does not warrant that:</p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>a) the Service will function uninterrupted, secure or available at any particular time or location;</li>
              <li>b) any errors or defects will be corrected;</li>
              <li>c) the Service is free of viruses or other harmful components;</li>
              <li>d) the results of using the Service will meet your requirements;</li>
              <li>e) <strong>any valuation or appraisal provided by the Service is accurate, complete, or reliable</strong>;</li>
              <li>f) <strong>any valuation provided is suitable for any particular purpose, including but not limited to insurance, sale, estate planning, or legal proceedings</strong>.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Indemnification</h2>
            <p className="text-slate-600 mb-4">
              You agree to defend, indemnify and hold harmless Why Not Us Labs LLC and its licensee and licensors, and their
              employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations,
              losses, liabilities, costs or debt, and expenses (including but not limited to attorney&apos;s fees), resulting from
              or arising out of a) your use and access of the Service, b) your violation of any term of these Terms, c) your
              violation of any third party right, including without limitation any copyright, property, or privacy right,
              d) any claim that your User Content caused damage to a third party, or e) <strong>any claim arising from your
              reliance on valuations provided by the Service</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Governing Law</h2>
            <p className="text-slate-600 mb-4">
              These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Changes</h2>
            <p className="text-slate-600 mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is
              material we will try to provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes
              a material change will be determined at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">12. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions about these Terms, please contact us:
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
