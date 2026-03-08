import React from 'react';
import { Mail, Phone, Upload, Disc, Calendar, Music } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Hero from '../components/Hero';

const Bookings: React.FC = () => {
   const { addSubscriber } = useData();
   const { user } = useAuth();

   return (

      <div className="pb-20 min-h-screen bg-[#0B0B0F]">
         <Hero
            badge="Event Reservations"
            title={<>BOOK <span className="text-brand-purple">DJ FLOWERZ</span></>}
            subtitle="Bring premium sounds and unmatched energy to your next event. Weddings, Corporate, Clubs, and Festivals."
            cta1Text="Inquire Now"
            cta1Link="#booking-form"
            bgImage="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000"
            showNewsletter={false}
         />
         <div id="booking-form" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

               {/* Booking Form */}
               <div className="lg:col-span-2 order-1 lg:order-1">
                  <div className="bg-[#15151A] p-8 rounded-3xl border border-white/10 shadow-xl">
                     <h3 className="text-2xl font-bold text-white mb-2">Event Inquiry</h3>
                     <p className="text-gray-400 mb-8">Fill out the details below for a custom quote.</p>

                     <form
                        className="space-y-6"
                        onSubmit={async (e) => {
                           e.preventDefault();
                           const formData = new FormData(e.currentTarget);
                           const name = formData.get('name') as string;
                           const email = formData.get('email') as string;
                           const phone = formData.get('phone') as string;
                           const eventType = formData.get('eventType') as string;
                           const eventDate = formData.get('eventDate') as string;
                           const duration = formData.get('duration') as string;
                           const location = formData.get('location') as string;
                           const details = formData.get('details') as string;
                           const budget = formData.get('budget') as string;

                           const btn = e.currentTarget.querySelector('button');
                           if (btn) {
                              btn.disabled = true;
                              btn.textContent = 'Submitting Request...';
                           }

                           try {
                              // 1. Record inquiry in D1 via Worker
                              const response = await fetch('/api/bookings/gig', {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({
                                    client_id: user?.id,
                                    name,
                                    email,
                                    phone,
                                    type: eventType,
                                    date: eventDate,
                                    location,
                                    duration,
                                    requirements: details,
                                    budget
                                 })
                              });

                              const data = await response.json();
                              if (!data.success) throw new Error('Failed to submit inquiry');

                              // 2. Alert success
                              alert('Booking inquiry sent! DJ FLOWERZ will contact you soon.');
                              (e.target as HTMLFormElement).reset();
                           } catch (err) {
                              console.error('Inquiry Error:', err);
                              alert('Something went wrong. Please try again.');
                           } finally {
                              if (btn) {
                                 btn.disabled = false;
                                 btn.textContent = 'Request Booking Quote';
                              }
                           }
                        }}
                     >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name *</label>
                              <input name="name" type="text" placeholder="John Doe" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address *</label>
                              <input name="email" type="email" placeholder="john@example.com" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone (WhatsApp) *</label>
                              <input name="phone" type="text" placeholder="+254..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Type *</label>
                              <select name="eventType" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple">
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
                              <input name="eventDate" type="date" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Time Duration *</label>
                              <input name="duration" type="text" placeholder="e.g. 6pm - 12am" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                           </div>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Event Location (City, Venue) *</label>
                           <input name="location" type="text" placeholder="Nairobi, Villa Rosa Kempinski" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" required />
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Details</label>
                           <textarea name="details" placeholder="Tell us about the crowd, music preferences, specific requirements..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white h-32 resize-none focus:outline-none focus:border-brand-purple"></textarea>
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
                              <input name="budget" type="number" placeholder="Enter your budget" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                           </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-purple/20 transition transform hover:-translate-y-1">
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
                           <Mail size={18} className="text-brand-purple" /> bookings@djflowerz.co.ke
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