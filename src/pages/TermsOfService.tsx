import { Shield, Lock, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3"><Shield className="h-8 w-8 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500">Last updated: May 27, 2026</p>
          </div>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-sm leading-relaxed text-gray-700">
          
          {/* Overview */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-gray-900">Overview</h2>
            </div>
            <p>Welcome to <strong>GlobalAccount</strong> ("Platform," "Company," "we," "us," or "our"). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and GlobalAccount governing your access to and use of our website, services, and platform located at globalaccount.com (collectively, the "Services").</p>
            <p className="mt-2">By creating an account, accessing, or using our Services in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any provision of these Terms, you must immediately discontinue use of our Services.</p>
            <p className="mt-2">GlobalAccount operates as a <strong>secure marketplace intermediary</strong> facilitating the sale and purchase of gaming accounts between verified buyers and sellers. We provide escrow payment protection, live middleman verification, and identity verification services to ensure safe transactions. We are not a party to the sale contract between buyer and seller.</p>
          </div>

          {/* 1. Eligibility */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Eligibility & Account Requirements</h2>
            <p>By using our Services, you represent and warrant that:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>You are at least <strong>18 years of age</strong> and possess the legal capacity to enter into binding contracts under applicable law.</li>
              <li>You are not a resident of, or located in, any country subject to comprehensive sanctions by the United Nations, OFAC, or similar international regulatory bodies.</li>
              <li>You are not listed on any denied-party, terrorist, or restricted-party list maintained by any government authority.</li>
              <li>All registration information you provide is <strong>true, accurate, current, and complete</strong>. You agree to maintain and promptly update this information.</li>
              <li>You will maintain only <strong>one account</strong>. Duplicate, fraudulent, or impersonating accounts are strictly prohibited and will result in immediate termination.</li>
            </ul>
          </section>

          {/* 2. Account Security */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Account Security & Responsibility</h2>
            <p>You are solely responsible for:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Maintaining the <strong>confidentiality</strong> of your login credentials, password, and authentication methods.</li>
              <li>All activities, transactions, and communications that occur under your account, whether authorized by you or not.</li>
              <li><strong>Immediately notifying us</strong> at support@globalaccount.com of any unauthorized access, suspected security breach, or compromise of your account.</li>
            </ul>
            <p className="mt-3">We implement industry-standard security measures including <strong>bcrypt password hashing, TLS 1.3 encryption in transit, and Row-Level Security (RLS)</strong> on all database tables. However, no security system is impenetrable. You should use a strong, unique password and enable any additional security features we may offer.</p>
          </section>

          {/* 3. Seller Obligations */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Seller Obligations & Representations</h2>
            <p>As a seller listing gaming accounts on GlobalAccount, you covenant and agree to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong>Legal Ownership:</strong> You are the sole, lawful owner of every account you list and possess the unrestricted right to transfer ownership. Stolen, hacked, cracked, or fraudulently obtained accounts are strictly prohibited.</li>
              <li><strong>Accurate Descriptions:</strong> All listing information — including game, platform, rank, inventory contents, and risk factors — must be complete and accurate. IGNs must never be disclosed in public listings.</li>
              <li><strong>Live Demo Participation:</strong> You must participate in the live screen-share demonstration via Discord with the assigned middleman. You agree to answer verification questions honestly.</li>
              <li><strong>Secure Credential Transfer:</strong> Account credentials shall only be shared through the designated secure process supervised by the middleman. Never share credentials outside of witnessed sessions.</li>
              <li><strong>KYC Verification:</strong> Prior to receiving any payout, you must complete the Know Your Customer (KYC) process including government-issued ID, selfie verification, and proof of address. This data is processed by our certified KYC partner and encrypted at rest.</li>
              <li><strong>No Off-Platform Dealing:</strong> You shall not solicit, communicate with, or transact with buyers outside of the GlobalAccount platform. Off-platform transactions bypass our escrow protection and middleman verification — they are strictly prohibited.</li>
              <li><strong>Post-Transfer Support:</strong> You agree to assist the buyer with any reasonable transition questions for 24 hours after transfer completion.</li>
            </ul>
            <div className="mt-3 rounded-lg bg-primary-light p-3">
              <p className="font-semibold text-primary">Platform Fee:</p>
              <p className="text-sm">Sellers are charged an <strong>8% service fee</strong> on the final listing price. This fee is deducted from the payout at the time funds are released from escrow. Payouts are processed via Stripe Connect to your verified payment method.</p>
            </div>
          </section>

          {/* 4. Buyer Obligations */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Buyer Obligations & Protections</h2>
            <p>As a buyer on GlobalAccount, you agree to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong>Full Payment:</strong> Pay the listing price plus a <strong>3% buyer service fee</strong> in full via our secure Stripe payment gateway. Funds are held in escrow — the seller does not receive payment until you confirm satisfaction.</li>
              <li><strong>Demo Participation:</strong> Attend the live Discord demo session. Review the account thoroughly. Approve or reject the demo through the transaction page in your dashboard.</li>
              <li><strong>Credential Change:</strong> During the witnessed transfer, change the account email and password while the middleman observes. This ensures you gain exclusive control.</li>
              <li><strong>Timely Confirmation:</strong> Confirm or dispute receipt of the account within 72 hours of credential delivery. Failure to respond within this window may result in automatic release of funds to the seller.</li>
              <li><strong>No Chargeback Abuse:</strong> You shall not initiate chargebacks, payment disputes, or reversals after successful delivery. Fraudulent chargebacks may result in account termination and legal action.</li>
            </ul>
            <div className="mt-3 rounded-lg bg-blue-50 p-3">
              <p className="font-semibold text-blue-700">Your Money is Protected:</p>
              <p className="text-sm text-blue-700">All buyer payments are held in a segregated escrow account via Stripe Connect. Funds are only released to the seller after: (1) you approve the demo, (2) the middleman witnesses the transfer, and (3) you confirm successful receipt of the account.</p>
            </div>
          </section>

          {/* 5. Middleman Service */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Middleman Service & Verification</h2>
            <p>GlobalAccount's middleman service is the cornerstone of our security model:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>All middlemen are <strong>vetted, trained, and background-checked</strong> by GlobalAccount before being added to the assignment queue.</li>
              <li>Middlemen are assigned via an automated <strong>round-robin system</strong> to ensure fair distribution and prevent collusion.</li>
              <li>The middleman's role is to <strong>verify, witness, and document</strong> every stage of the transaction — they do not take possession of any account credentials or funds.</li>
              <li>Middlemen create <strong>temporary, private Discord channels</strong> for each transaction. Channel contents are archived for dispute resolution purposes and deleted after 30 days.</li>
              <li>GlobalAccount reserves the right to reassign or replace middlemen at any time. Middleman decisions regarding demo verification and transfer witnessing are final.</li>
            </ul>
          </section>

          {/* 6. Escrow & Payment Processing */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Escrow & Payment Processing</h2>
            <p>All payments on GlobalAccount are processed through <strong>Stripe Connect</strong>, a PCI DSS Level 1 certified payment processor — the highest level of security certification in the payments industry.</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong>Escrow Protection:</strong> Buyer payments are placed in a segregated escrow account. Neither GlobalAccount nor the seller can access these funds until the transaction is verified as complete.</li>
              <li><strong>Payment Capture:</strong> We use Stripe's manual capture method — funds are authorized at purchase but only captured upon buyer confirmation of successful delivery.</li>
              <li><strong>Payout Schedule:</strong> Seller payouts (listing price minus 8% fee) are released after all three conditions are met: demo approved, transfer witnessed, funds released by middleman.</li>
              <li><strong>Currency:</strong> All transactions are denominated in United States Dollars (USD). Currency conversion fees, if applicable, are the responsibility of the paying party.</li>
              <li><strong>Taxes:</strong> You are responsible for any applicable taxes, VAT, GST, or similar obligations arising from your use of our platform.</li>
            </ul>
          </section>

          {/* 7. Disputes */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">7. Dispute Resolution</h2>
            <p>In the event of a dispute between buyer and seller:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Either party may initiate a dispute by clicking <strong>"Report Issue"</strong> on the transaction page, which immediately suspends fund release.</li>
              <li>Our admin team will review the case, including: Discord channel logs, payment records, demo verification status, and communications between parties.</li>
              <li>Possible resolutions include: <strong>full refund to buyer, release of funds to seller, or partial split</strong> based on evidence reviewed.</li>
              <li>Admin decisions are <strong>final and binding</strong>. By using our platform, you agree to this binding arbitration process for all transaction disputes.</li>
              <li>Disputes must be raised within 7 days of transaction completion. Claims raised after this period may not be eligible for review.</li>
            </ul>
          </section>

          {/* 8. Prohibited Conduct */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">8. Prohibited Conduct</h2>
            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-800">The following activities are strictly prohibited and will result in immediate account termination:</p>
              </div>
              <ul className="list-disc space-y-1.5 pl-6 text-red-700">
                <li>Listing stolen, hacked, phished, or otherwise fraudulently obtained accounts</li>
                <li>Attempting to bypass our escrow system, middleman process, or platform fees</li>
                <li>Harassing, threatening, or abusing other users, middlemen, or platform staff</li>
                <li>Using automated scripts, bots, scrapers, or data mining tools</li>
                <li>Posting false, misleading, or deceptive information in listings</li>
                <li>Engaging in money laundering, terrorist financing, or any illegal financial activity</li>
                <li>Violating any game publisher's Terms of Service in a manner that could subject GlobalAccount to liability</li>
                <li>Creating multiple accounts, engaging in review manipulation, or feedback fraud</li>
                <li>Reverse-engineering, decompiling, or extracting our platform's source code</li>
              </ul>
            </div>
          </section>

          {/* 9. Intellectual Property */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">9. Intellectual Property</h2>
            <p>All game titles, characters, logos, and trademarks displayed on our platform are the property of their respective owners. GlobalAccount is an independent marketplace and is <strong>not affiliated with, endorsed by, or sponsored by</strong> any game developer or publisher unless explicitly stated.</p>
            <p className="mt-2">The GlobalAccount platform, including its code, design, branding, and proprietary technology, is protected by copyright and intellectual property laws. You may not copy, modify, distribute, or create derivative works from any portion of our platform without express written permission.</p>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>GlobalAccount provides the platform on an <strong>"as is" and "as available"</strong> basis without warranties of any kind, express or implied.</li>
              <li>We are not liable for indirect, incidental, consequential, special, or punitive damages arising from your use of the platform.</li>
              <li>Our maximum aggregate liability for any claim shall not exceed the <strong>platform fees collected by GlobalAccount</strong> for the specific transaction giving rise to the claim.</li>
              <li>GlobalAccount is not responsible for accounts that are banned, suspended, or modified by game developers or publishers after transfer.</li>
              <li>We are not liable for losses arising from events beyond our reasonable control, including but not limited to: natural disasters, internet outages, third-party service failures, or government action.</li>
            </ul>
          </section>

          {/* 11. Privacy & Data Protection */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">11. Privacy & Data Protection</h2>
            <p>Your privacy is protected under our comprehensive <Link to="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>, which forms an integral part of these Terms. By using our platform, you consent to the collection, processing, and storage of your data as described therein. Key protections include:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong>Encryption:</strong> All data is encrypted in transit via TLS 1.3 and at rest using AES-256 encryption.</li>
              <li><strong>Access Control:</strong> Row-Level Security (RLS) ensures users can only access their own data. Sensitive operations require service role authentication.</li>
              <li><strong>KYC Data:</strong> Identity verification documents are processed by certified third-party providers and are never stored on our primary database.</li>
              <li><strong>Payment Data:</strong> We do not store full credit card numbers, CVV codes, or bank account details. All payment processing is handled by Stripe.</li>
              <li><strong>Account Credentials:</strong> Game account credentials shared during transactions are encrypted using pgcrypto and transmitted through secure, ephemeral channels.</li>
            </ul>
          </section>

          {/* 12. Termination */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">12. Termination & Suspension</h2>
            <p>We reserve the right to suspend or terminate your account, with or without notice, for any of the following reasons:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Violation of any provision of these Terms</li>
              <li>Suspected fraudulent, illegal, or unauthorized activity</li>
              <li>Extended account inactivity (12 months or more)</li>
              <li>Failure to complete KYC verification when required</li>
              <li>Chargeback abuse or payment fraud</li>
              <li>Upon valid request by law enforcement or regulatory authority</li>
            </ul>
          </section>

          {/* 13. Changes */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">13. Amendments to These Terms</h2>
            <p>We may modify these Terms at any time at our sole discretion. Material changes will be communicated via email to registered users and/or by a prominent notice on our platform. Changes become effective immediately upon posting unless otherwise specified. Your continued use of the Services after any modification constitutes acceptance of the updated Terms.</p>
          </section>

          {/* 14. Governing Law */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">14. Governing Law & Jurisdiction</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws applicable to the jurisdiction in which GlobalAccount is incorporated. Any legal action arising from these Terms shall be brought exclusively in the competent courts of that jurisdiction.</p>
          </section>

          {/* 15. Contact */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-bold text-gray-900">15. Contact Information</h2>
            </div>
            <p>For questions, concerns, or legal notices regarding these Terms of Service, contact us at:</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Email:</strong> support@globalaccount.com</li>
              <li><strong>Legal:</strong> legal@globalaccount.com</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
