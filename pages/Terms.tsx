import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-display font-bold text-white mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the DJ FLOWERZ platform ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Digital Content & Licensing</h2>
            <p>
              All mixtapes and musical content provided on this platform are for personal, non-commercial use only. You may not redistribute, resell, or perform the content publicly without written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. DJ FLOWERZ reserves the right to terminate accounts that violate our community guidelines or engage in fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Marketplace & Escrow</h2>
            <p>
              DJ FLOWERZ provides an escrow service for marketplace transactions. While we facilitate secure payments and dispute resolution, we are not responsible for the quality or legality of items listed by third-party sellers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p>
              DJ FLOWERZ shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Governing Law</h2>
            <p>
              These terms are governed by the laws of Kenya. Any disputes shall be resolved in the competent courts of Nairobi.
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

export default Terms;
