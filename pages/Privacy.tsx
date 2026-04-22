import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-5xl font-display font-black text-white mb-4 uppercase tracking-tighter">Privacy Policy</h1>
        <p className="text-brand-purple font-bold uppercase tracking-widest text-sm mb-12">Safeguarding Your Creative Freedom • Last Updated: April 2026</p>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">1. Data Standards (Kenya)</h2>
            <p>
              DJ Flowerz Creations is committed to the privacy and security of our users. We comply with the **Data Protection Act (2019) of the Republic of Kenya**. This policy outlines how we collect, store, and process your personal data when you use our marketplace and community services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">2. Information We Collect</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-brand-purple font-bold uppercase text-xs mb-3">Identity & Verification</h3>
                <p className="text-sm">Name, email, and phone number for account creation. For Verified Sellers, we may process identification documents purely for status verification (status is stored, documents are not retained).</p>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-brand-cyan font-bold uppercase text-xs mb-3">Commerce Data</h3>
                <p className="text-sm">Shipping addresses, transaction history, and "Trust Signals" (ratings, reports, and seller performance metrics) used to maintain marketplace integrity.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">3. Payment & Escrow Security</h2>
            <p className="mb-4">
              All financial transactions are handled by **Paystack**, an industrial-grade secure payment processor. DJ Flowerz never stores your credit card or M-Pesa PIN on our servers.
            </p>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-4">
               <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 shrink-0 animate-pulse" />
               <p className="text-xs text-yellow-500 font-medium">Note: We reserve the right to share relevant transaction data with authorized law enforcement in cases of suspected fraud or money laundering within the marketplace.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">4. Trust & Safety Analytics</h2>
            <p className="mb-4">
              We collect interaction data (post views, reshares, reports) to improve the community experience and detect bots or malicious actors. This data is used to award **Aura Points** and determine **Aura Tiers** within the DJ Flowerz ecosystem.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">5. Your Privacy Rights</h2>
            <p className="mb-4">
              You have the right to request a copy of your personal data, object to its processing, or request erasure. Please contact our Data Officer via **privacy@djflowerz.co.ke** for any data-related inquiries.
            </p>
          </section>

          <div className="pt-12 border-t border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-600 flex justify-between">
            <span>DJ FLOWERZ CREATIONS</span>
            <span>PROTECTING YOUR DATA AT THE EDGE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
