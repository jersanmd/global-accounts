import { Shield, Lock, Server, Eye, FileCheck, Database, Globe, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PRIVACY_EMAIL } from "@/lib/constants";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3"><Shield className="h-8 w-8 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Privacy Policy</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: May 27, 2026</p>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          {/* Commitment */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-700" />
              <h2 className="text-base font-bold text-green-900">Our Commitment to Your Privacy</h2>
            </div>
            <p className="text-green-800">
              At RaidStore, protecting your personal information is fundamental to our business. We have designed our platform with privacy and security as core architectural principles — not afterthoughts. We employ bank-grade encryption, strict access controls, and industry-best practices to ensure your data remains confidential, integral, and available only to those you authorize.
            </p>
            <p className="mt-2 text-green-800">
              This Privacy Policy provides a comprehensive explanation of what data we collect, why we collect it, how we protect it, and what rights you have over it. We encourage you to read this document in its entirety.
            </p>
          </div>

          {/* 1. Data Controller */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Who We Are (Data Controller)</h2>
            <p>
              RaidStore ("Company," "we," "us," "our") operates the marketplace platform at raidstore.com. We act as the <strong>data controller</strong> for personal information collected through our Services. This means we determine the purposes and means of processing your personal data.
            </p>
            <p className="mt-2">
              For privacy-related inquiries, contact our Data Protection Officer at: <strong>{PRIVACY_EMAIL}</strong>
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Information We Collect</h2>
            <p>We collect information you provide directly, information generated through your use of our platform, and information from third-party services you connect. Here is every category of data we may collect:</p>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">Account & Profile Data</h3>
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>Email address (required)</li>
                  <li>Encrypted password (bcrypt hashed — we never see your plain-text password)</li>
                  <li>Display name / username</li>
                  <li>Discord username and Discord ID (optional, for transaction communication)</li>
                  <li>Profile avatar URL</li>
                  <li>Account creation date</li>
                  <li>Role (buyer, seller, middleman, admin)</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">Transaction & Marketplace Data</h3>
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>Listing details (game, platform, rank, price, inventory description)</li>
                  <li>Listing screenshots (uploaded to encrypted cloud storage)</li>
                  <li>Purchase and sale history</li>
                  <li>Transaction status and progress</li>
                  <li>Discord channel IDs for transaction communications</li>
                  <li>Reviews and ratings you give or receive</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">KYC & Identity Verification Data (Sellers Only)</h3>
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>Full legal name</li>
                  <li>Date of birth</li>
                  <li>Government-issued photo identification (passport, driver's license, or national ID)</li>
                  <li>Live selfie for liveness verification</li>
                  <li>Proof of residential address (utility bill, bank statement)</li>
                  <li><strong>Important:</strong> This sensitive data is processed directly by our certified KYC partner (Sumsub or Persona). It is transmitted over encrypted channels, verified, and stored in their SOC 2 Type II compliant infrastructure — not on our primary database. We receive only a verification status (approved/rejected) and a reference token.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">Payment Data</h3>
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>Transaction amounts and timestamps</li>
                  <li>Payment method type (card brand, last 4 digits)</li>
                  <li><strong>We do NOT store:</strong> Full credit card numbers, CVV/CVC codes, bank account numbers, or PINs. All payment processing is handled exclusively by Stripe (PCI DSS Level 1 certified).</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">Technical & Usage Data (Automatically Collected)</h3>
                </div>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>IP address and approximate geographic location (country/city level)</li>
                  <li>Browser type, version, and language settings</li>
                  <li>Operating system and device type</li>
                  <li>Referring URL and exit pages</li>
                  <li>Pages visited, features used, and time spent</li>
                  <li>Session timestamps and interaction events</li>
                  <li>Online presence heartbeat (last_seen_at timestamp for online status display)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. How We Use Data */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">3. How We Use Your Information</h2>
            <p>We use your data exclusively for legitimate business purposes. Here is every purpose, with its legal basis:</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-900">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-900">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-2.5">Provide our platform and core marketplace services</td><td className="px-4 py-2.5 text-gray-500">Contractual necessity</td></tr>
                  <tr><td className="px-4 py-2.5">Process transactions and facilitate escrow payments</td><td className="px-4 py-2.5 text-gray-500">Contractual necessity</td></tr>
                  <tr><td className="px-4 py-2.5">Assign middlemen via automated round-robin queue</td><td className="px-4 py-2.5 text-gray-500">Contractual necessity</td></tr>
                  <tr><td className="px-4 py-2.5">Verify seller identity (KYC) before payouts</td><td className="px-4 py-2.5 text-gray-500">Legal obligation (AML/CTF compliance)</td></tr>
                  <tr><td className="px-4 py-2.5">Display seller profiles (username, rating, online status) to buyers</td><td className="px-4 py-2.5 text-gray-500">Legitimate interest</td></tr>
                  <tr><td className="px-4 py-2.5">Facilitate Discord channel creation for transactions</td><td className="px-4 py-2.5 text-gray-500">Contractual necessity</td></tr>
                  <tr><td className="px-4 py-2.5">Prevent fraud, abuse, and money laundering</td><td className="px-4 py-2.5 text-gray-500">Legal obligation & legitimate interest</td></tr>
                  <tr><td className="px-4 py-2.5">Send transactional emails (purchase confirmations, status updates)</td><td className="px-4 py-2.5 text-gray-500">Contractual necessity</td></tr>
                  <tr><td className="px-4 py-2.5">Improve platform performance and user experience</td><td className="px-4 py-2.5 text-gray-500">Legitimate interest</td></tr>
                  <tr><td className="px-4 py-2.5">Comply with legal obligations and respond to lawful requests</td><td className="px-4 py-2.5 text-gray-500">Legal obligation</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Data Sharing */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Who We Share Your Data With</h2>
            <p>We share your information only with the parties necessary to provide our services. We <strong>never sell</strong> your personal data to third parties for marketing or any other purpose.</p>
            
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Other Platform Users</p>
                <p className="mt-1 text-gray-600">Seller profiles (username, rating, KYC status, online presence) are displayed to buyers browsing listings. During active transactions, buyer details are shared with the assigned seller and middleman to facilitate communication and delivery.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Stripe (Payment Processing)</p>
                <p className="mt-1 text-gray-600">Payment information is transmitted directly to Stripe via their secure Elements SDK. Stripe is PCI DSS Level 1 certified. View Stripe's privacy policy at stripe.com/privacy.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">KYC Provider (Sumsub / Persona)</p>
                <p className="mt-1 text-gray-600">Seller identity documents are processed by a certified KYC provider with SOC 2 Type II compliance. We receive only verification outcomes, not raw document data.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Supabase (Database & Auth Infrastructure)</p>
                <p className="mt-1 text-gray-600">Our platform runs on Supabase's infrastructure. Your data is stored in Supabase-managed PostgreSQL databases with encryption at rest. Supabase is SOC 2 compliant. View Supabase's privacy policy at supabase.com/privacy.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Discord (Communication)</p>
                <p className="mt-1 text-gray-600">Discord usernames/IDs are used to invite users to temporary transaction channels. Communication within these channels is subject to Discord's privacy policy.</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-900">Legal & Regulatory Authorities</p>
                <p className="mt-1 text-gray-600">We may disclose information when required by law, court order, or governmental regulation, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.</p>
              </div>
            </div>
          </section>

          {/* 5. Data Security */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">5. How We Protect Your Data — Security Architecture</h2>
            <p>We employ a multi-layered security architecture to protect your information at every stage — in transit, at rest, and during processing:</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { icon: Lock, title: "Encryption in Transit", desc: "All data transmitted between your browser and our servers is encrypted using TLS 1.3 with strong cipher suites. API endpoints enforce HTTPS exclusively — HTTP connections are rejected." },
                { icon: Server, title: "Encryption at Rest", desc: "Database contents are encrypted at rest using AES-256. Supabase-managed encryption keys are rotated regularly. Backups are also encrypted." },
                { icon: Shield, title: "Row-Level Security (RLS)", desc: "Every database table has Row-Level Security policies enforced at the PostgreSQL level. Users can only access rows they are authorized to see, even if a query is intercepted." },
                { icon: Eye, title: "Password Hashing", desc: "User passwords are hashed using bcrypt with a per-password salt. We never store plain-text passwords — we couldn't see them even if we wanted to." },
                { icon: Database, title: "Credential Encryption", desc: "Game account credentials shared during transactions are encrypted using pgcrypto with service-role keys. They are decrypted only within secure Edge Function environments." },
                { icon: FileCheck, title: "KYC Data Isolation", desc: "Identity documents are transmitted directly to our KYC provider over encrypted channels. They are never stored on our primary application database." },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-1.5"><item.icon className="h-4 w-4 text-primary" /></div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  </div>
                  <p className="text-gray-600 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Data Retention Policy</h2>
            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-gray-50"><th className="px-4 py-3 font-semibold text-gray-900">Data Category</th><th className="px-4 py-3 font-semibold text-gray-900">Retention Period</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-2.5">Account & profile data</td><td className="px-4 py-2.5 text-gray-500">Duration of account + 30 days after deletion request</td></tr>
                  <tr><td className="px-4 py-2.5">Transaction records</td><td className="px-4 py-2.5 text-gray-500">7 years (legal/accounting requirement)</td></tr>
                  <tr><td className="px-4 py-2.5">KYC verification data</td><td className="px-4 py-2.5 text-gray-500">5 years after last transaction (AML regulatory requirement)</td></tr>
                  <tr><td className="px-4 py-2.5">Discord channel transcripts</td><td className="px-4 py-2.5 text-gray-500">30 days after transaction completion</td></tr>
                  <tr><td className="px-4 py-2.5">Payment records</td><td className="px-4 py-2.5 text-gray-500">7 years (financial regulation)</td></tr>
                  <tr><td className="px-4 py-2.5">Usage logs & analytics</td><td className="px-4 py-2.5 text-gray-500">12 months</td></tr>
                  <tr><td className="px-4 py-2.5">Inactive accounts</td><td className="px-4 py-2.5 text-gray-500">Auto-suspended at 12 months inactivity; data purged at 24 months</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. Your Rights */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">7. Your Data Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
            <div className="mt-3 space-y-2">
              {[
                { right: "Right of Access", desc: "Request a copy of all personal data we hold about you in a structured, machine-readable format." },
                { right: "Right to Rectification", desc: "Correct any inaccurate or incomplete personal data we hold about you." },
                { right: "Right to Erasure (Right to be Forgotten)", desc: "Request deletion of your personal data, subject to legal retention requirements." },
                { right: "Right to Restrict Processing", desc: "Limit how we process your data in certain circumstances." },
                { right: "Right to Data Portability", desc: "Receive your data in a portable format and transfer it to another controller." },
                { right: "Right to Object", desc: "Object to processing based on legitimate interests, including direct marketing (which we do not conduct)." },
                { right: "Right to Withdraw Consent", desc: "Withdraw consent at any time where processing is based on consent." },
              ].map(item => (
                <div key={item.right} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="font-semibold text-gray-900">{item.right}</p>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">To exercise any of these rights, email <strong>{PRIVACY_EMAIL}</strong>. We will respond within 30 days. We may require identity verification before processing your request.</p>
          </section>

          {/* 8. Cookies */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">8. Cookies & Tracking Technologies</h2>
            <p>We use the following categories of cookies:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li><strong>Essential Cookies:</strong> Required for core platform functionality — authentication sessions, security tokens, and CSRF protection. These cannot be disabled.</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences (sort order, filter selections) to improve your experience.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform so we can improve it. Data is anonymized and aggregated.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> use advertising cookies, tracking pixels for ad networks, or sell browsing data to advertisers. You can control cookie preferences through your browser settings.</p>
          </section>

          {/* 9. International Transfers */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">9. International Data Transfers</h2>
            <p>Your data may be processed in countries where our service providers (Supabase, Stripe, KYC provider) operate their infrastructure. We ensure that all data transfers comply with applicable data protection laws through:</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Standard Contractual Clauses (SCCs) with all service providers</li>
              <li>Data Processing Agreements (DPAs) that bind providers to equivalent security standards</li>
              <li>Selection of providers with SOC 2 Type II and ISO 27001 certifications where available</li>
            </ul>
          </section>

          {/* 10. Children */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">10. Children's Privacy</h2>
            <p>Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal data, please contact us immediately at {PRIVACY_EMAIL}. Upon verification, we will promptly delete such information.</p>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-lg font-bold text-gray-900">11. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy periodically to reflect changes in our practices, technology, or legal requirements. Material changes will be communicated via email to registered users and a prominent notice on our platform at least 14 days before taking effect. The "Last updated" date at the top of this policy indicates when the most recent changes were made.</p>
          </section>

          {/* 12. Contact */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-700" />
              <h2 className="text-base font-bold text-green-900">12. Privacy Inquiries & Data Requests</h2>
            </div>
            <p className="text-green-800">If you have questions about this Privacy Policy, wish to exercise your data rights, or need to report a privacy concern:</p>
            <ul className="mt-2 space-y-1 text-green-800">
              <li><strong>Data Protection Officer:</strong> dpo@raidstore.com</li>
              <li><strong>General Privacy:</strong> {PRIVACY_EMAIL}</li>
              <li><strong>Response Time:</strong> We aim to acknowledge all inquiries within 48 hours and resolve them within 30 days.</li>
            </ul>
          </div>

          <p className="text-center text-xs text-gray-400">
            This Privacy Policy is incorporated into and subject to our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </p>

        </div>
      </div>
    </div>
  );
}
