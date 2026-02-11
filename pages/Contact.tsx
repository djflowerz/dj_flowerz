
import React from 'react';
import { Mail, Phone, Send, FileText, Lock, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Contact: React.FC = () => {
  const { siteConfig } = useData();
  const { contact, socials } = siteConfig;

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase">Contact Us</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">Have questions, need support, or want to collaborate? We're here to help.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Form */}
            <div className="bg-[#15151A] p-8 rounded-3xl border border-white/10 shadow-xl">
               <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
               <form className="space-y-6">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Name</label>
                     <input type="text" placeholder="John Doe" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                     <input type="email" placeholder="john@example.com" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subject</label>
                     <select className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple">
                        <option>Select a topic</option>
                        <option>Support</option>
                        <option>Booking</option>
                        <option>Collaboration</option>
                        <option>Other</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Message</label>
                     <textarea placeholder="Tell us how we can help..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white h-40 resize-none focus:outline-none focus:border-brand-purple"></textarea>
                  </div>
                  <button className="w-full py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20">
                     <Send size={18} /> Send Message
                  </button>
               </form>
            </div>

            {/* Info Side */}
            <div className="space-y-8">
               
               {/* Contact Channels */}
               <div className="bg-[#15151A] p-8 rounded-3xl border border-white/10">
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple flex-shrink-0">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-1">Email</h4>
                            <p className="text-sm text-gray-400 mb-1">For general inquiries and support</p>
                            <a href={`mailto:${contact.email}`} className="text-brand-purple font-bold hover:underline">{contact.email}</a>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-1">WhatsApp</h4>
                            <p className="text-sm text-gray-400 mb-1">Quick responses for urgent matters</p>
                            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`} className="text-green-500 font-bold hover:underline">{contact.whatsapp}</a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                            <Send size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-1">Telegram</h4>
                            <p className="text-sm text-gray-400 mb-1">Join our community channel</p>
                            <a href={socials.telegram || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">
                                {socials.telegram ? '@dj_flowerz' : 'Not Connected'}
                            </a>
                        </div>
                    </div>
                  </div>
               </div>

               {/* Legal & Response */}
               <div className="bg-[#15151A] p-8 rounded-3xl border border-white/10">
                  <h4 className="font-bold text-white mb-2">Response Time</h4>
                  <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-white/5">We typically respond within 24 hours on business days.</p>
                  
                  <div className="space-y-4">
                     <Link to="/terms" className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <FileText size={18} className="text-gray-500 group-hover:text-brand-purple transition" />
                            <div>
                                <h5 className="text-white font-bold text-sm group-hover:text-brand-purple transition">Terms of Service</h5>
                                <p className="text-xs text-gray-500">Read our terms and conditions</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition" />
                     </Link>

                     <Link to="/privacy" className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <Lock size={18} className="text-gray-500 group-hover:text-brand-purple transition" />
                            <div>
                                <h5 className="text-white font-bold text-sm group-hover:text-brand-purple transition">Privacy Policy</h5>
                                <p className="text-xs text-gray-500">How we handle your data</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition" />
                     </Link>

                     <Link to="/refunds" className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={18} className="text-gray-500 group-hover:text-brand-purple transition" />
                            <div>
                                <h5 className="text-white font-bold text-sm group-hover:text-brand-purple transition">Refund Policy</h5>
                                <p className="text-xs text-gray-500">Our refund guidelines</p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition" />
                     </Link>
                  </div>
               </div>
               
               {/* Booking CTA */}
               <div className="bg-brand-purple text-white p-8 rounded-3xl text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                  <h4 className="font-bold text-xl mb-2 relative z-10">Looking to Book DJ FLOWERZ?</h4>
                  <p className="text-purple-100 text-sm mb-6 relative z-10">For event bookings, collaborations, or press inquiries, visit our dedicated booking page.</p>
                  <Link to="/bookings" className="inline-block px-8 py-3 bg-white text-brand-purple font-bold rounded-full hover:bg-gray-100 transition shadow-lg relative z-10">
                     Book Now
                  </Link>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Contact;
