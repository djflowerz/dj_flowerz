import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-5xl font-display font-black text-white mb-4 uppercase tracking-tighter">Terms of Service</h1>
        <p className="text-brand-purple font-bold uppercase tracking-widest text-sm mb-12">Version 2.0 • Last Updated: April 22, 2026</p>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using the DJ FLOWERZ platform ("the Site"), including the Community Hub and Marketplace, you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and DJ Flowerz Creations.
            </p>
            <p>
              Users must be at least 18 years of age or possess legal parental or guardian consent to conduct transactions in the Marketplace.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center text-sm">2</span>
              Escrow & Marketplace Security
            </h2>
            <div className="space-y-4">
              <p>
                To eliminate fraud and ensure "High-Trust" commerce, DJ Flowerz operates a mandatory **Escrow Protection System** for all marketplace deals initiated via the "Buy Now" button.
              </p>
              <ul className="list-none space-y-3">
                <li className="flex gap-3"><span className="text-brand-purple font-bold">●</span> <strong>Payment Holding:</strong> Funds are held securely by DJ Flowerz via our payment partners until the buyer confirms receipt of the item.</li>
                <li className="flex gap-3"><span className="text-brand-purple font-bold">●</span> <strong>Release Window:</strong> Upon delivery, buyers have 48 hours to confirm the item is as described. If no report is filed, funds are automatically released to the seller.</li>
                <li className="flex gap-3"><span className="text-brand-purple font-bold">●</span> <strong>Dispute Resolution:</strong> Our admin team acts as an impartial arbitrator for all disputed trades. Decisions made by the DJ Flowerz Governance team are final.</li>
              </ul>
            </div>
          </section>

          <section className="bg-brand-cyan/5 border border-brand-cyan/20 rounded-[2rem] p-8">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">3. Seller Verification & Conduct</h2>
            <p className="mb-4">
              Our trust signals (Verified Badges and Seller Scorecards) are data-driven. Engaging in "shill bidding," fake reviews, or attempting to circumvent the escrow system by requesting direct M-Pesa payments on WhatsApp is grounds for an immediate **Permanent Ban**.
            </p>
            <p>
              Verified Sellers must maintain a Seller Score above 80% to retain their status. Repeated negative feedback will trigger a "Caution" badge or account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">4. Digital Content & Music Pool</h2>
            <p className="mb-4">
              Mixtapes and Sound Tools provided via the Music Pool are licensed for professional use by DJs. Unauthorized distribution or bulk-scraping of our music server is strictly prohibited and will be prosecuted under intellectual property laws.
            </p>
            <p>
              Subscriptions to the Music Pool are recurring unless cancelled. Refund eligibility for digital subscriptions is limited once the content has been accessed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">5. Governing Law (Kenya)</h2>
            <p>
              These terms are governed by the **Laws of the Republic of Kenya**. By using this site, you submit to the exclusive jurisdiction of the courts in Nairobi for any disputes. We comply strictly with the Data Protection Act (2019) regarding your personal information.
            </p>
          </section>

          <div className="pt-12 border-t border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-600 flex justify-between">
            <span>© 2026 DJ Flowerz Creations</span>
            <span>All Rights Reserved</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
