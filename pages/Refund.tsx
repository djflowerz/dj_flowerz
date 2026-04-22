import React from 'react';

const Refund: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-5xl font-display font-black text-white mb-4 uppercase tracking-tighter">Refund & Dispute Policy</h1>
        <p className="text-brand-cyan font-bold uppercase tracking-widest text-sm mb-12">Total Protection for Buyers and Sellers • Last Updated: April 2026</p>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">1. The Escrow Safeguard</h2>
            <p className="mb-4">
              All Marketplace transactions are protected by the DJ Flowerz Escrow system. When you purchase an item (Order format: **ORD-XXX**), your funds are held in a secure bridge account.
            </p>
            <ul className="list-none space-y-3">
              <li className="flex gap-3"><span className="text-brand-cyan font-bold">●</span> <strong>Automatic Protection:</strong> If a seller fails to ship the item within 5 business days, the buyer is entitled to an immediate and full refund.</li>
              <li className="flex gap-3"><span className="text-brand-cyan font-bold">●</span> <strong>The 48-Hour Clock:</strong> Once an item is marked as "Delivered," the buyer has exactly 48 hours to inspect it. After this window, the escrow releases funds to the seller, and no further refund claims can be processed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">2. Non-Refundable Items</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-brand-purple font-bold uppercase text-xs mb-3">Digital Content</h3>
                <p className="text-sm">Mixtapes, sample packs, and music pool access are non-refundable once the media has been accessed or downloaded. We recommend checking audio previews before purchase.</p>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h3 className="text-brand-cyan font-bold uppercase text-xs mb-3">Service Fees</h3>
                <p className="text-sm">Transaction fees and platform commissions (typically 5-7%) are non-refundable as they cover fixed costs from our payment partners (Paystack).</p>
              </div>
            </div>
          </section>

          <section className="bg-brand-purple/5 border border-brand-purple/20 rounded-[2rem] p-8">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">3. Marketplace Dispute Adjudication</h2>
            <p className="mb-4">
              If an item is "Not as Described" or "Counterfeit," the buyer MUST click the **"Dispute"** button before the 48-hour escrow window expires.
            </p>
            <p>
              Our Governance Team will review photos, shipping tracking, and chat logs. If the dispute is ruled in favor of the buyer, the escrow will be refunded to the original payment method (M-Pesa or Card) within 3-5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">4. Canceled Orders</h2>
            <p className="mb-4">
              Sellers may cancel an order before shipping without penalty. Buyers will receive a full refund including shipping fees. Repeated cancellations by a seller will negatively impact their **Seller Scorecard** and may result in the loss of their "Verified Member" badge.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">5. Contacting Support</h2>
            <p className="mb-4">
              For any help with refunds or active disputes, open a ticket via the **DJ Flowerz AI Assistant** or email us directly at **disputes@djflowerz.co.ke**. Always include your Order ID for faster processing.
            </p>
          </section>

          <div className="pt-12 border-t border-white/10 text-xs font-bold uppercase tracking-widest text-zinc-600 flex justify-between">
            <span>DJ FLOWERZ CREATIONS</span>
            <span>TRANSPARENT • SECURE • FAIR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Refund;
