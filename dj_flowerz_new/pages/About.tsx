import React from 'react';
import { useData } from '../context/DataContext';
import { Award, Music, Mic, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  const { siteConfig } = useData();
  const { about } = siteConfig;

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
           <div className="w-full md:w-1/2">
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                 <img src={about.image} alt="DJ Profile" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                 <div className="absolute bottom-6 left-6">
                    <span className="bg-brand-purple text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Professional DJ</span>
                 </div>
              </div>
           </div>
           
           <div className="w-full md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                 {about.title}
              </h1>
              <div className="space-y-6 text-gray-300 text-lg leading-relaxed">
                 {about.bio.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                 ))}
              </div>
              
              <div className="flex gap-4 mt-8">
                 <Link to="/bookings" className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-brand-cyan transition">
                    Book Now
                 </Link>
                 <Link to="/mixtapes" className="px-8 py-3 border border-white/20 text-white font-bold rounded-lg hover:bg-white/10 transition">
                    Listen to Mixes
                 </Link>
              </div>
           </div>
        </div>

        {/* Stats / Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
           {[
             { icon: Music, label: "Mixtapes Released", value: "50+" },
             { icon: Mic, label: "Live Events", value: "500+" },
             { icon: Star, label: "Happy Clients", value: "100%" },
             { icon: Award, label: "Years Experience", value: "10+" },
           ].map((stat, i) => (
             <div key={i} className="bg-[#15151A] p-6 rounded-2xl border border-white/5 text-center hover:border-brand-purple/30 transition">
                <stat.icon className="text-brand-purple mx-auto mb-3" size={32} />
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-gray-500 text-sm">{stat.label}</p>
             </div>
           ))}
        </div>

        {/* Timeline */}
        {about.careerTimeline && about.careerTimeline.length > 0 && (
           <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-white mb-12">Career Journey</h2>
              <div className="space-y-8">
                 {about.careerTimeline.map((item, idx) => (
                    <div key={idx} className="flex gap-6 group">
                       <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-brand-cyan group-hover:scale-125 transition"></div>
                          {idx !== about.careerTimeline!.length - 1 && <div className="w-0.5 flex-1 bg-white/10 my-2"></div>}
                       </div>
                       <div className="pb-8">
                          <span className="text-brand-purple font-bold text-xl block mb-2">{item.year}</span>
                          <p className="text-white text-lg">{item.event}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default About;