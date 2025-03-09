import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - PasteBin Rich Text</title>
        <meta 
          name="description" 
          content="Learn about how PasteBin Rich Text collects, uses, and protects your information." 
        />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-4">Effective Date: March 15, 2024</p>
          <p className="text-gray-600 mb-8">
            PasteBin Rich Text ("we," "us," or "our") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, and safeguard your information when 
            you use our website pastebinrichtext.com (the "Service").
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">1.1 Information You Provide</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>User Content: Any text, code, or data you paste and submit on the platform.</li>
                  <li>Contact Information: If you reach out for support, we may collect your email or other details you provide.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">1.2 Automatically Collected Information</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Usage Data: We may collect analytics on how users interact with our website (e.g., pages visited, time spent).</li>
                  <li>Device & Log Data: Your browser type, IP address, and interactions may be logged for security and optimization purposes.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">1.3 Cookies & Tracking Technologies</h3>
                <p className="text-gray-600">
                  We use cookies and similar technologies to enhance your experience and analyze site traffic.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide and improve the Service.</li>
              <li>Monitor website security and prevent misuse.</li>
              <li>Optimize user experience and website performance.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Share Your Information</h2>
            <p className="text-gray-600 mb-4">
              We do not sell or trade your personal data. However, we may share information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>With service providers for analytics, hosting, or ad placements (e.g., Google or Ezoic).</li>
              <li>When required by law enforcement or legal obligations.</li>
              <li>To prevent fraud, abuse, or security threats.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Services & Ads</h2>
            <p className="text-gray-600">
              We may display third-party advertisements (e.g., via Google or Ezoic). These partners may 
              collect anonymous browsing data through cookies. You can manage ad settings via your browser.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600">
              We take reasonable measures to protect your information. However, no online platform is 
              100% secure. Use the Service at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Privacy Rights</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Opt-Out: You can disable cookies in your browser settings.</li>
              <li>Delete Content: You may remove your pasted content at any time.</li>
              <li>Data Requests: If you have privacy concerns, contact us at Support@PasteBinRichText.com</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this Privacy Policy as needed. Any changes will be reflected on this page 
              with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Us</h2>
            <p className="text-gray-600 flex items-center gap-2">
              For questions or privacy-related concerns, contact us at:
              <a 
                href="mailto:Support@PasteBinRichText.com"
                className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                Support@PasteBinRichText.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}