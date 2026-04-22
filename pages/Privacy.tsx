import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-display font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, make a purchase, or interact with our community hub. This includes your name, email address, and payment information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>
              We use the collected information to provide, maintain, and improve our services, process transactions, send technical notices, and communicate with you about products, services, and events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Sharing of Information</h2>
            <p>
              We do not sell your personal information. We may share information with third-party service providers (such as payment processors like Paystack) only to the extent necessary to perform their services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Cookies</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze site usage, and personalize content. You can disable cookies in your browser settings, though some features may not function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team.
            </p>
          </section>

          <footer className="pt-8 border-t border-white/10 text-sm italic">
            Last Updated: April 2026
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
