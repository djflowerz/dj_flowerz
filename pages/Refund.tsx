import React from 'react';

const Refund: React.FC = () => {
  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-display font-bold text-white mb-8">Refund Policy</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Digital Goods</h2>
            <p>
              Due to the nature of digital goods (music downloads, mixtapes), all sales are final once the download link has been accessed or the media has been streamed. Refunds will only be considered in cases of technical failure where the product cannot be delivered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Physical Merchandise</h2>
            <p>
              For physical items purchased from our store, we accept returns within 14 days of delivery. Items must be unused, in their original packaging, and accompanied by the receipt. Return shipping costs are the responsibility of the customer unless the item arrived damaged or defective.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Subscriptions (Music Pool)</h2>
            <p>
              Subscription fees for the Music Pool are non-refundable. You may cancel your subscription at any time to prevent future billing, but you will retain access to the service until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Escrow & Marketplace Disputes</h2>
            <p>
              Refunds for marketplace transactions utilizing our escrow service are subject to the dispute resolution process. Funds will be refunded to the buyer if the seller fails to deliver the specified goods or if adjudication rules in favor of the buyer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Process for Requesting a Refund</h2>
            <p>
              To request a refund for an eligible purchase, please contact us at <a href="mailto:admin@djflowerz.co.ke" className="text-brand-cyan hover:underline">admin@djflowerz.co.ke</a> with your order number (e.g., ORD-...) and the reason for the request. We aim to process all requests within 5-7 business days.
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

export default Refund;
