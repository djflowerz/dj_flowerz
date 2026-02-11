import React from 'react';
import { Facebook, Instagram, Twitter, Youtube, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Footer: React.FC = () => {
  const { siteConfig } = useData();
  const { footer, socials, contact } = siteConfig;

  return (
    <footer className="bg-[#050507] border-t border-white/5 pt-12 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-2xl font-display font-bold tracking-wider">
              <span className="text-white">DJ</span>
              <span className="text-brand-purple ml-1">FLOWERZ</span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              {footer.description}
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/mixtapes" className="hover:text-brand-cyan transition">Mixtapes</Link></li>
              <li><Link to="/music-pool" className="hover:text-brand-cyan transition">Music Pool</Link></li>
              <li><Link to="/store" className="hover:text-brand-cyan transition">Store</Link></li>
              <li><Link to="/bookings" className="hover:text-brand-cyan transition">Bookings</Link></li>
              <li><Link to="/about" className="hover:text-brand-cyan transition">About</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/contact" className="hover:text-brand-cyan transition">Contact Us</Link></li>
              <li><Link to="/terms" className="hover:text-brand-cyan transition">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-cyan transition">Privacy Policy</Link></li>
              <li><Link to="/tip-jar" className="hover:text-brand-cyan transition">Tip Jar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-4">Connect</h3>
            <div className="flex space-x-4">
              {socials.instagram && <a href={socials.instagram} className="text-gray-400 hover:text-brand-purple transition"><Instagram size={20} /></a>}
              {socials.twitter && <a href={socials.twitter} className="text-gray-400 hover:text-brand-purple transition"><Twitter size={20} /></a>}
              {socials.youtube && <a href={socials.youtube} className="text-gray-400 hover:text-brand-purple transition"><Youtube size={20} /></a>}
              {socials.facebook && <a href={socials.facebook} className="text-gray-400 hover:text-brand-purple transition"><Facebook size={20} /></a>}
            </div>
            <div className="mt-4 flex items-center gap-2 text-gray-400 text-sm">
               <Mail size={16} /> {contact.email}
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 text-center text-gray-500 text-xs">
          {footer.copyright}
        </div>
      </div>
    </footer>
  );
};

export default Footer;