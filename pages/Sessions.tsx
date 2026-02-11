import React, { useState, useMemo } from 'react';
import { Mic, Speaker, Cpu, Music, Wifi, Coffee, Gamepad, Zap, ArrowRight, Camera, HardDrive, Cable, Layers, Sliders, Headphones, Check, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Sessions: React.FC = () => {
  const { studioEquipment } = useData();
  const [selectedService, setSelectedService] = useState('vocal');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Group equipment by category for display
  const gearCategories = useMemo(() => {
    const categories: Record<string, any> = {
      'Microphones': { title: 'Microphones', icon: Mic, items: [] },
      'Monitoring & Acoustics': { title: 'Monitoring & Acoustics', icon: Speaker, items: [] },
      'Hardware & Interface': { title: 'Hardware & Interface', icon: Cpu, items: [] },
      'Production Materials': { title: 'Production Materials', icon: Layers, items: [] },
    };

    // Default catch-all for unknown categories
    const otherCategory = { title: 'Other Equipment', icon: Music, items: [] };

    studioEquipment.forEach(item => {
      if (categories[item.category]) {
        categories[item.category].items.push(item);
      } else {
        otherCategory.items.push(item);
      }
    });

    const result = Object.values(categories).filter(c => c.items.length > 0);
    if (otherCategory.items.length > 0) result.push(otherCategory);
    return result;
  }, [studioEquipment]);

  const amenities = [
    { icon: Wifi, label: 'High-Speed Fiber Wi-Fi' },
    { icon: Coffee, label: 'Refreshments & Coffee' },
    { icon: Gamepad, label: 'PS5 Lounge Area' },
    { icon: Zap, label: 'Backup Power Generator' },
  ];

  const galleryImages = [
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
  ];

  const services = [
    {
      id: 'vocal',
      title: 'Vocal Recording',
      icon: Mic,
      desc: 'Professional vocal chain recording in a treated booth.',
      price: 'KES 1,500/hr'
    },
    {
      id: 'mixing',
      title: 'Mixing & Mastering',
      icon: Sliders,
      desc: 'Industry standard mixing to get your track radio ready.',
      price: 'From KES 3,000'
    },
    {
      id: 'djmix',
      title: 'DJ Mix Recording',
      icon: Music,
      desc: 'High fidelity recording of your DJ set (Audio + Video option).',
      price: 'KES 2,000/hr'
    },
    {
      id: 'podcast',
      title: 'Podcast / Voiceover',
      icon: Headphones,
      desc: 'Crystal clear voice recording for podcasts and ads.',
      price: 'KES 1,500/hr'
    }
  ];

  const packages = [
    {
      name: 'Basic Session',
      price: 1500,
      period: '/ hour',
      features: ['Vocal Recording', 'Engineer Included', 'Raw Stems Delivery', 'Standard Booth Time'],
      isPopular: false
    },
    {
      name: 'Pro Session',
      price: 5000,
      period: '/ block (4hrs)',
      features: ['Vocal Recording', 'Engineer Included', 'Rough Mix', 'Vocal Tuning', 'Refreshments'],
      isPopular: true
    },
    {
      name: 'Full Song Package',
      price: 10000,
      period: '/ song',
      features: ['Recording Unlimited', 'Full Mix & Master', 'Radio Edit', 'Performance Track', '2 Revisions'],
      isPopular: false
    }
  ];

  return (
    <div className="pt-20 pb-20 bg-[#0B0B0F] min-h-screen">
      
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden mb-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/90 to-black/50"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <span className="text-brand-cyan font-bold tracking-widest uppercase text-sm mb-4 block animate-fade-in-up">The Official Studio</span>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 animate-fade-in-up delay-100">
            Sessions & <span className="text-brand-purple">Gear</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8 animate-fade-in-up delay-200">
            World-class equipment meets creative comfort. View our inventory and book your session below.
          </p>
          <a href="#booking-form" className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 border border-white/20 rounded-full text-white font-bold hover:bg-brand-purple hover:border-brand-purple transition animate-fade-in-up delay-300">
             Scroll to Booking <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Intro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
           <div>
              <h2 className="text-3xl font-display font-bold text-white mb-6">Engineered for <span className="text-brand-purple">Excellence</span></h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                 At DJ Flowerz Studios, we believe the environment is just as important as the equipment. Our space is acoustically treated to industry standards, ensuring what you hear is exactly what you get.
              </p>
              <div className="mt-8 flex gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                      <HardDrive size={18} className="text-brand-cyan"/> Solid State Storage
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Cable size={18} className="text-brand-cyan"/> Gold Plated Audio Paths
                  </div>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              {amenities.map((item, idx) => (
                 <div key={idx} className="bg-[#15151A] p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:border-brand-cyan/30 transition group">
                    <item.icon size={32} className="text-brand-cyan mb-3 group-hover:scale-110 transition" />
                    <span className="text-white font-medium text-sm">{item.label}</span>
                 </div>
              ))}
           </div>
        </div>

        {/* Detailed Gear List with Images */}
        <section className="mb-24">
           <div className="flex items-center gap-4 mb-12">
              <div className="h-px bg-white/10 flex-1"></div>
              <h2 className="text-3xl font-display font-bold text-white text-center">Production <span className="text-brand-purple">Inventory</span></h2>
              <div className="h-px bg-white/10 flex-1"></div>
           </div>

           <div className="grid grid-cols-1 gap-12">
              {gearCategories.map((category: any, idx) => (
                 <div key={idx} className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                       <category.icon className="text-brand-purple" size={28} />
                       <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {category.items.map((item: any, i: number) => (
                          <div key={i} className="group bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 transition">
                             <div className="aspect-square bg-gray-800 overflow-hidden relative">
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                   <span className="text-brand-cyan text-xs font-bold uppercase tracking-wider">{item.category}</span>
                                </div>
                             </div>
                             <div className="p-4">
                                <p className="text-white font-bold text-sm truncate">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
           </div>
        </section>

        {/* Gallery */}
        <section className="mb-24">
           <h2 className="text-3xl font-display font-bold text-white mb-8 flex items-center gap-3">
              <Camera className="text-brand-purple" /> Studio Gallery
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {galleryImages.map((img, idx) => (
                 <div key={idx} className={`rounded-xl overflow-hidden border border-white/10 relative group ${idx === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                    <img src={img} alt="Studio Session" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                       <span className="text-white font-bold tracking-widest uppercase text-sm border border-white/30 px-4 py-2 rounded-full backdrop-blur-md">View Full Size</span>
                    </div>
                 </div>
              ))}
           </div>
        </section>

        {/* ---------------- BOOKING SECTION ---------------- */}
        
        <div id="booking-form" className="py-12 border-t border-white/10">
            <h2 className="text-3xl font-display font-bold text-white text-center mb-12">Book Your <span className="text-brand-cyan">Session</span></h2>
            
            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {services.map((service) => (
                 <div 
                   key={service.id} 
                   onClick={() => setSelectedService(service.id)}
                   className={`p-6 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${selectedService === service.id ? 'bg-[#1A1A24] border-brand-purple shadow-lg shadow-brand-purple/10' : 'bg-[#15151A] border-white/5 hover:border-white/20'}`}
                 >
                    <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple mb-4">
                       <service.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 min-h-[40px]">{service.desc}</p>
                    <p className="text-brand-cyan font-bold">{service.price}</p>
                 </div>
              ))}
           </div>

           {/* Packages */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {packages.map((pkg, idx) => (
                 <div key={idx} className={`relative bg-[#15151A] rounded-2xl border p-8 flex flex-col ${pkg.isPopular ? 'border-brand-purple shadow-2xl shadow-brand-purple/10 transform scale-105 z-10' : 'border-white/10'}`}>
                    {pkg.isPopular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full uppercase">Most Popular</div>}
                    <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                    <div className="mb-6">
                       <span className="text-sm text-gray-500">KES</span>
                       <span className="text-4xl font-bold text-white mx-1">{pkg.price.toLocaleString()}</span>
                       <span className="text-sm text-gray-500">{pkg.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                       {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-300">
                             <Check size={16} className="text-brand-cyan mr-2 mt-0.5" /> {feat}
                          </li>
                       ))}
                    </ul>
                    <button className={`w-full py-3 rounded-lg font-bold text-center transition ${pkg.isPopular ? 'bg-brand-purple text-white hover:bg-purple-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                       Select Package
                    </button>
                 </div>
              ))}
           </div>

           {/* Booking Form */}
           <div className="bg-[#15151A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                 {/* Calendar / Availability UI */}
                 <div className="lg:col-span-2 bg-[#1A1A24] p-8 border-r border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                       <Calendar className="text-brand-purple" /> Check Availability
                    </h3>
                    <div className="mb-6">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Date</label>
                       <input 
                         type="date" 
                         className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-purple"
                         onChange={(e) => setSelectedDate(e.target.value)}
                       />
                    </div>
                    <div className="mb-6">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Available Slots</label>
                       <div className="grid grid-cols-2 gap-2">
                          {['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((time) => (
                             <button 
                               key={time}
                               onClick={() => setSelectedTime(time)}
                               className={`py-2 px-3 rounded text-sm font-medium transition ${selectedTime === time ? 'bg-brand-purple text-white' : 'bg-black/20 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                             >
                                {time}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="bg-brand-cyan/10 border border-brand-cyan/20 p-4 rounded-lg">
                       <p className="text-xs text-brand-cyan flex items-start gap-2">
                          <Check size={14} className="mt-0.5" />
                          Studio engineer included in all bookings.
                       </p>
                    </div>
                 </div>

                 {/* Confirmation Form */}
                 <div className="lg:col-span-3 p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Confirm Details</h3>
                    <form className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Your Name</label>
                             <input type="text" placeholder="John Doe" className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone</label>
                             <input type="text" placeholder="+254..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple" />
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Session Type</label>
                          <select 
                            value={selectedService} 
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-brand-purple"
                          >
                             {services.map(s => <option key={s.id} value={s.id}>{s.title} ({s.price})</option>)}
                          </select>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</label>
                          <textarea placeholder="Any specific requirements..." className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white h-24 resize-none focus:outline-none focus:border-brand-purple"></textarea>
                       </div>

                       <div className="flex items-center justify-between border-t border-white/5 pt-6">
                          <div>
                             <p className="text-sm text-gray-500">Deposit Required</p>
                             <p className="text-xl font-bold text-white">KES 1,000</p>
                          </div>
                          <button type="submit" className="px-8 py-4 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-purple/20 transition">
                             Book Session
                          </button>
                       </div>
                    </form>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Sessions;