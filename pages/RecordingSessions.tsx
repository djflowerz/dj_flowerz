import React, { useState, useEffect, useMemo } from 'react';
import { Mic, Music, Sliders, Calendar, Clock, Check, Play, Headphones, ArrowRight, Star, Info, MapPin, Cpu, AlertCircle, ChevronRight, ChevronLeft, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Constants & Data ---

const LOCATIONS = [
  { 
    id: 'studio-a', 
    name: 'Main Suite (Westlands)', 
    rate: 2000, 
    desc: 'Full acoustic treatment, vocal booth, client lounge.',
    features: ['Vocal Booth', 'Lounge', 'AC', 'Private Entrance'] 
  },
  { 
    id: 'studio-b', 
    name: 'Production Room B', 
    rate: 1500, 
    desc: 'Ideal for mixing, beat-making, and podcasting.',
    features: ['Mixing Desk', 'Nearfield Monitors', 'Fast Wi-Fi'] 
  },
  { 
    id: 'mobile', 
    name: 'On-Location / Mobile', 
    rate: 3500, 
    desc: 'We bring the studio to your house or venue.',
    features: ['Portable Rig', 'Engineer Travel', 'Setup Included'] 
  }
];

const PREMIUM_GEAR = [
  { 
    id: 'sony-c800g', 
    name: 'Sony C800G Pac', 
    hourlyRate: 1000, 
    category: 'Microphone', 
    image: 'https://images.unsplash.com/photo-1590845947698-8924d7409b56?auto=format&fit=crop&q=80&w=200',
    unavailableTimes: ['2023-11-25T14:00'] // Mock unavailability
  },
  { 
    id: 'telefunken', 
    name: 'Telefunken U47', 
    hourlyRate: 800, 
    category: 'Microphone', 
    image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'analog-synths', 
    name: 'Analog Synth Rack', 
    hourlyRate: 500, 
    category: 'Instruments', 
    image: 'https://images.unsplash.com/photo-1563330232-5711c00f60f6?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'video-cam', 
    name: '4K Cinema Camera', 
    hourlyRate: 1500, 
    category: 'Video', 
    image: 'https://images.unsplash.com/photo-1588483977959-badc9893d432?auto=format&fit=crop&q=80&w=200',
    desc: 'Operator included'
  }
];

const PACKAGES = [
  {
    name: 'Basic Session',
    price: 1500,
    period: '/ hour',
    features: ['Vocal Recording', 'Engineer Included', 'Raw Stems', 'Standard Mic'],
    isPopular: false
  },
  {
    name: 'Pro Session',
    price: 5000,
    period: '/ 4hr block',
    features: ['Vocal Recording', 'Mixing Included', 'Vocal Tuning', 'Sony Mic Access', 'Refreshments'],
    isPopular: true
  },
  {
    name: 'Full Song',
    price: 10000,
    period: '/ song',
    features: ['Unlimited Recording', 'Full Mix & Master', 'Radio Edit', 'Performance Track', '2 Revisions'],
    isPopular: false
  }
];

const RecordingSessions: React.FC = () => {
  // Booking State
  const [step, setStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(2);
  const [selectedGear, setSelectedGear] = useState<string[]>([]);
  
  // Computed Availability Logic
  const checkAvailability = (gearId: string) => {
    // Mock Logic: If date is selected and gear has conflicts
    const gear = PREMIUM_GEAR.find(g => g.id === gearId);
    if (!selectedDate || !selectedTime) return { available: true };
    
    // Simulate collision
    if (gear?.unavailableTimes?.includes(`${selectedDate}T${selectedTime}`)) {
       return { available: false, reason: 'Reserved for Video Shoot' };
    }
    return { available: true };
  };

  // Pricing Calculation
  const calculateTotal = useMemo(() => {
    const locationCost = selectedLocation.rate * duration;
    
    const gearCost = selectedGear.reduce((acc, gearId) => {
       const item = PREMIUM_GEAR.find(g => g.id === gearId);
       return acc + (item ? item.hourlyRate * duration : 0);
    }, 0);

    return locationCost + gearCost;
  }, [selectedLocation, duration, selectedGear]);

  const toggleGear = (id: string) => {
    const status = checkAvailability(id);
    if (!status.available) return;

    setSelectedGear(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  return (
    <div className="pt-20 pb-20 bg-[#0B0B0F] min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden mb-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-black/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
            Book Your <span className="text-brand-purple">Session</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Customize your production environment. Select your location, equipment, and time.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: Booking Wizard */}
            <div className="lg:col-span-2">
                
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 px-2 md:px-4">
                   {[
                     { num: 1, label: 'Location' },
                     { num: 2, label: 'Time' },
                     { num: 3, label: 'Gear' },
                     { num: 4, label: 'Confirm' }
                   ].map((s) => (
                      <div key={s.num} className="flex flex-col items-center relative z-10">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s.num ? 'bg-brand-purple text-white' : 'bg-white/10 text-gray-500'}`}>
                            {step > s.num ? <Check size={16} /> : s.num}
                         </div>
                         <span className={`text-[10px] md:text-xs mt-2 ${step >= s.num ? 'text-white' : 'text-gray-600'}`}>{s.label}</span>
                      </div>
                   ))}
                   {/* Connector Line */}
                   <div className="absolute left-0 right-0 top-4 h-0.5 bg-white/5 -z-0 mx-8 lg:w-2/3 lg:mx-auto"></div>
                </div>

                <div className="bg-[#15151A] border border-white/10 rounded-3xl p-6 md:p-8 min-h-[500px]">
                    
                    {/* STEP 1: LOCATION */}
                    {step === 1 && (
                       <div className="animate-fade-in-up">
                          <h2 className="text-2xl font-bold text-white mb-6">Select Studio Location</h2>
                          <div className="grid grid-cols-1 gap-4">
                             {LOCATIONS.map((loc) => (
                                <div 
                                  key={loc.id}
                                  onClick={() => setSelectedLocation(loc)}
                                  className={`p-6 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${selectedLocation.id === loc.id ? 'bg-brand-purple/10 border-brand-purple' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                >
                                   <div>
                                      <div className="flex items-center gap-2 mb-1">
                                         <MapPin size={18} className={selectedLocation.id === loc.id ? 'text-brand-purple' : 'text-gray-500'} />
                                         <h3 className="font-bold text-white text-lg">{loc.name}</h3>
                                      </div>
                                      <p className="text-gray-400 text-sm mb-3">{loc.desc}</p>
                                      <div className="flex flex-wrap gap-2">
                                         {loc.features.map((f, i) => (
                                            <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-300">{f}</span>
                                         ))}
                                      </div>
                                   </div>
                                   <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                                      <span className="block text-xl font-bold text-white">KES {loc.rate.toLocaleString()}</span>
                                      <span className="text-xs text-gray-500">/ hour</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* STEP 2: DATE & TIME */}
                    {step === 2 && (
                       <div className="animate-fade-in-up">
                          <h2 className="text-2xl font-bold text-white mb-6">Schedule Session</h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date</label>
                                <input 
                                  type="date" 
                                  className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-brand-purple focus:outline-none"
                                  value={selectedDate}
                                  onChange={(e) => setSelectedDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Duration (Hours)</label>
                                <div className="flex items-center gap-4">
                                   <input 
                                     type="range" 
                                     min="2" 
                                     max="12" 
                                     step="1"
                                     value={duration}
                                     onChange={(e) => setDuration(parseInt(e.target.value))}
                                     className="flex-1 accent-brand-purple"
                                   />
                                   <span className="text-2xl font-bold text-white w-12 text-center">{duration}h</span>
                                </div>
                             </div>
                          </div>

                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-4">Available Start Times</label>
                             <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'].map(time => (
                                   <button 
                                     key={time}
                                     onClick={() => setSelectedTime(time)}
                                     className={`py-3 rounded-lg text-sm font-bold border transition ${selectedTime === time ? 'bg-white text-black border-white' : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'}`}
                                   >
                                      {time}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    )}

                    {/* STEP 3: GEAR SELECTION */}
                    {step === 3 && (
                       <div className="animate-fade-in-up">
                          <div className="flex justify-between items-center mb-6">
                             <h2 className="text-2xl font-bold text-white">Add Premium Equipment</h2>
                             <span className="text-xs text-brand-cyan bg-brand-cyan/10 px-3 py-1 rounded-full hidden sm:inline">Standard mic included in base rate</span>
                          </div>
                          <div className="sm:hidden mb-4 text-xs text-brand-cyan bg-brand-cyan/10 px-3 py-1 rounded-full inline-block">Standard mic included</div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {PREMIUM_GEAR.map((item) => {
                                const status = checkAvailability(item.id);
                                const isSelected = selectedGear.includes(item.id);

                                return (
                                   <div 
                                      key={item.id}
                                      onClick={() => toggleGear(item.id)}
                                      className={`relative p-4 rounded-xl border flex gap-4 transition-all ${status.available ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${isSelected ? 'bg-brand-purple/10 border-brand-purple' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                   >
                                      <div className="w-20 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                         <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1">
                                         <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-white">{item.name}</h3>
                                            {isSelected && <Check size={18} className="text-brand-purple" />}
                                         </div>
                                         <p className="text-xs text-gray-400 mb-2">{item.category}</p>
                                         <p className="text-brand-cyan font-bold text-sm">+ KES {item.hourlyRate}/hr</p>
                                         
                                         {!status.available && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl backdrop-blur-sm">
                                               <span className="text-xs font-bold text-red-400 bg-red-900/50 px-3 py-1 rounded-full border border-red-500/30">
                                                  Unavailable: {status.reason}
                                               </span>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                       </div>
                    )}

                    {/* STEP 4: CONFIRM */}
                    {step === 4 && (
                       <div className="animate-fade-in-up">
                          <h2 className="text-2xl font-bold text-white mb-6">Review Booking</h2>
                          
                          <div className="bg-black/20 rounded-xl p-6 border border-white/5 space-y-4 mb-8">
                             <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <span className="text-gray-400">Location</span>
                                <span className="font-bold text-white text-right sm:text-left">{selectedLocation.name}</span>
                             </div>
                             <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                <span className="text-gray-400">Date & Time</span>
                                <span className="font-bold text-white text-right sm:text-left">{selectedDate} @ {selectedTime} ({duration} hrs)</span>
                             </div>
                             
                             {selectedGear.length > 0 && (
                                <div>
                                   <span className="text-gray-400 block mb-2">Premium Gear</span>
                                   {selectedGear.map(id => {
                                      const g = PREMIUM_GEAR.find(i => i.id === id);
                                      return (
                                         <div key={id} className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300">+ {g?.name}</span>
                                            <span className="text-brand-purple">KES {g?.hourlyRate}/hr</span>
                                         </div>
                                      );
                                   })}
                                </div>
                             )}
                          </div>

                          <form className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Full Name" className="bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                                <input type="tel" placeholder="Phone" className="bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                             </div>
                             <textarea placeholder="Production Notes (e.g. Genre, Reference Tracks)" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white h-20 resize-none focus:border-brand-purple focus:outline-none"></textarea>
                          </form>
                       </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
                       {step > 1 ? (
                          <button 
                             onClick={() => setStep(step - 1)}
                             className="px-6 py-3 rounded-lg border border-white/10 text-white font-bold hover:bg-white/5 transition flex items-center gap-2"
                          >
                             <ChevronLeft size={18} /> Back
                          </button>
                       ) : (
                          <div></div>
                       )}

                       {step < 4 ? (
                          <button 
                             onClick={() => setStep(step + 1)}
                             disabled={step === 2 && (!selectedDate || !selectedTime)}
                             className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             Next Step <ChevronRight size={18} />
                          </button>
                       ) : (
                          <button className="px-8 py-3 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-purple/20 transition flex items-center gap-2">
                             <CreditCard size={18} /> Pay Deposit (KES 1,000)
                          </button>
                       )}
                    </div>

                </div>
            </div>

            {/* RIGHT: Summary & Packages */}
            <div className="lg:col-span-1 space-y-8">
               
               {/* Live Calculator */}
               <div className="bg-[#15151A] rounded-3xl border border-white/10 p-6 sticky top-24">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                     <Info size={18} className="text-brand-purple" /> Estimated Total
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                     <div className="flex justify-between text-sm text-gray-400">
                        <span>Base Rate ({duration}h)</span>
                        <span>KES {(selectedLocation.rate * duration).toLocaleString()}</span>
                     </div>
                     {selectedGear.length > 0 && (
                        <div className="flex justify-between text-sm text-gray-400">
                           <span>Equipment Add-ons</span>
                           <span>KES {(calculateTotal - (selectedLocation.rate * duration)).toLocaleString()}</span>
                        </div>
                     )}
                     <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-white/5">
                        <span>Engineer Fee</span>
                        <span className="text-green-500">Included</span>
                     </div>
                  </div>

                  <div className="flex justify-between items-center text-2xl font-bold text-white mb-6">
                     <span>Total</span>
                     <span>KES {calculateTotal.toLocaleString()}</span>
                  </div>

                  <div className="bg-brand-cyan/10 p-3 rounded-lg text-xs text-brand-cyan leading-relaxed mb-4">
                     Price varies based on selected gear availability and time slots.
                  </div>
               </div>

               {/* Standard Packages (Alternative) */}
               <div>
                  <h3 className="font-bold text-white mb-4">Fixed Price Packages</h3>
                  <div className="space-y-4">
                     {PACKAGES.map((pkg, idx) => (
                        <div key={idx} className="bg-black/20 rounded-xl p-4 border border-white/5 hover:border-brand-purple/30 transition group cursor-pointer">
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-white">{pkg.name}</h4>
                              {pkg.isPopular && <span className="text-[10px] bg-brand-purple text-white px-2 py-0.5 rounded-full">HOT</span>}
                           </div>
                           <p className="text-brand-cyan font-bold text-sm mb-2">KES {pkg.price.toLocaleString()} <span className="text-gray-500 font-normal">{pkg.period}</span></p>
                           <p className="text-xs text-gray-400 group-hover:text-white transition">Includes: {pkg.features.slice(0, 3).join(', ')}...</p>
                        </div>
                     ))}
                  </div>
               </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default RecordingSessions;