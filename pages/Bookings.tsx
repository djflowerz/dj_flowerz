import React from 'react';
import { Mail, Phone, Upload, Disc, Calendar, Music } from 'lucide-react';

const Bookings: React.FC = () => {
  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block p-4 rounded-full bg-white/5 mb-6 animate-fade-in-up">
             <Disc size={40} className="text-brand-purple animate-spin-slow" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase">Book DJ Flowerz</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Bring premium sounds and unmatched energy to your next event. Weddings, Corporate, Clubs, and Festivals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           
           {/* Booking Form */}
           <div className="lg:col-span-2 order-1 lg:order-1">
              <div className="bg-[#15151A] p-8 rounded-3xl border border-white/10 shadow-xl">
                 <h3 className="text-2xl font-bold text-white mb-2">Event Inquiry</h3>
                 <p className="text-gray-400 mb-8">Fill out the details below for a custom quote.</p>
                 
                 <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name *</label>
                          <input type="text" placeholder="John Doe" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address *</label>
                          <input type="email" placeholder="john@example.com" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone (WhatsApp) *</label>
                          <input type="text" placeholder="+254..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Type *</label>
                          <select className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple">
                             <option>Wedding Reception</option>
                             <option>Corporate Event</option>
                             <option>Club / Lounge Set</option>
                             <option>Private Party</option>
                             <option>Festival / Concert</option>
                             <option>Other</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Date *</label>
                          <input type="date" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Time Duration *</label>
                          <input type="text" placeholder="e.g. 6pm - 12am" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                       </div>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Location (City, Venue) *</label>
                       <input type="text" placeholder="Nairobi, Villa Rosa Kempinski" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Details</label>
                       <textarea placeholder="Tell us about the crowd, music preferences, specific requirements..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white h-32 resize-none focus:outline-none focus:border-brand-purple"></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Attachments</label>
                          <div className="w-full bg-black/20 border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-white/5 transition">
                             <Upload size={24} className="mb-2" />
                             <span className="text-xs">Upload Run of Show / Plans</span>
                          </div>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Budget Range (KES)</label>
                          <input type="number" placeholder="Enter your budget" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                       </div>
                    </div>

                    <button className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-purple/20 transition transform hover:-translate-y-1">
                       Request Booking Quote
                    </button>
                 </form>
              </div>
           </div>

           {/* Sidebar Info */}
           <div className="lg:col-span-1 space-y-8 order-2 lg:order-2">
              {/* Why Book Me */}
              <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5">
                 <h3 className="text-xl font-bold text-white mb-6">Why DJ Flowerz?</h3>
                 <div className="space-y-6">
                    <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0"><Music size={18} className="text-brand-purple" /></div>
                       <div>
                           <h4 className="font-bold text-white mb-1">Versatile Style</h4>
                           <p className="text-sm text-gray-400">Master of all genres: Afrobeats, Amapiano, Hip-Hop, House & Classics.</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-brand-cyan/10 flex items-center justify-center flex-shrink-0"><Disc size={18} className="text-brand-cyan" /></div>
                       <div>
                           <h4 className="font-bold text-white mb-1">Pro Equipment</h4>
                           <p className="text-sm text-gray-400">We bring high-end sound and lighting if the venue needs it.</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0"><Calendar size={18} className="text-green-500" /></div>
                       <div>
                           <h4 className="font-bold text-white mb-1">Reliable</h4>
                           <p className="text-sm text-gray-400">Punctual, professional, and experienced in 500+ events.</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Direct Contact */}
              <div className="bg-brand-purple/5 p-6 rounded-2xl border border-brand-purple/20">
                 <h3 className="text-xl font-bold text-white mb-4">Urgent Booking?</h3>
                 <p className="text-sm text-gray-400 mb-6">For last-minute requests, please reach out via WhatsApp.</p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white font-medium">
                       <Mail size={18} className="text-brand-purple" /> djflowerz254@gmail.com
                    </div>
                    <div className="flex items-center gap-3 text-white font-medium">
                       <Phone size={18} className="text-brand-purple" /> +254 789 783 258
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Bookings;