import React, { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Checkout: React.FC = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart on mount as this page represents a successful return from Payment Gateway
    clearCart();
  }, []);

  return (
    <div className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-[#0B0B0F]">
      <div className="text-center p-8 max-w-md w-full bg-[#15151A] rounded-2xl border border-white/5 shadow-2xl animate-fade-in-up">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Your order has been confirmed. A receipt and download links (if applicable) have been sent to your email.
        </p>
        
        <div className="space-y-4">
            <Link to="/account" className="block w-full py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2">
              <Download size={18} /> View My Downloads
            </Link>
            <Link to="/" className="block w-full py-4 bg-white/5 text-gray-300 font-bold rounded-lg hover:bg-white/10 transition flex items-center justify-center gap-2">
              Back to Home <ArrowRight size={18} />
            </Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;