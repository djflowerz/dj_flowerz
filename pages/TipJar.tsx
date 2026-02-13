import React, { useState } from 'react';
import { Heart, Coffee } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TipJar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');

  const presets = [100, 200, 500, 1000];

  const config = {
    reference: `tip_${(new Date()).getTime()}`,
    email: user?.email || "guest_tipper@djflowerz.com",
    amount: (Number(amount) || 0) * 100, // Amount in KES cents
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_fd545124e451381254315431543', // Fallback or throw error
    currency: 'KES',
    metadata: {
      custom_fields: [
        {
          display_name: "Message",
          variable_name: "message",
          value: message
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: any) => {
    navigate('/success', {
      state: {
        type: 'tip',
        reference: reference.reference,
        amount: Number(amount),
        message: message,
        email: user?.email
      }
    });
    setAmount('');
    setMessage('');
  };

  const onClose = () => {
    console.log('Payment closed');
  };

  const handlePayment = () => {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    initializePayment({ onSuccess, onClose });
  };

  return (
    <div className="pt-24 md:pt-32 pb-20 min-h-screen flex items-center justify-center bg-[#0B0B0F]">
      <div className="max-w-md w-full px-4 sm:px-0">
        <div className="bg-[#15151A] rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-purple to-brand-cyan"></div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-pink-500 to-orange-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Heart size={28} className="text-white animate-pulse md:w-8 md:h-8" fill="currentColor" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">Show Some Love</h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed">
              Your support helps keep the mixtapes free and the vibes flowing.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {presets.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className={`py-3 rounded-xl text-sm font-bold border transition active:scale-95 ${amount === val ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-black/20 border-white/10 text-gray-300 hover:border-brand-purple hover:text-white'}`}
              >
                {val}
              </button>
            ))}
          </div>

          <div className="mb-6 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">KES</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Custom Amount"
              className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-16 pr-4 text-white text-lg font-bold focus:outline-none focus:border-brand-purple placeholder-gray-600 transition-colors"
            />
          </div>

          <div className="mb-8">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message (optional)..."
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white text-base focus:outline-none focus:border-brand-purple h-24 resize-none placeholder-gray-600 transition-colors"
            ></textarea>
          </div>

          <button
            onClick={handlePayment}
            className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold text-lg rounded-xl shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40 transition transform active:scale-[0.98] hover:-translate-y-1"
          >
            Send Tip
          </button>

          <p className="text-center text-xs text-gray-500 mt-6 flex items-center justify-center gap-1.5 opacity-80">
            <Coffee size={14} /> Powered by Paystack (M-Pesa & Card)
          </p>
        </div>

        {/* Mobile Security Badge */}
        <div className="mt-6 flex justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-6" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default TipJar;