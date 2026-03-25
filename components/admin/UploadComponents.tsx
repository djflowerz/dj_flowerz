import React, { useState } from 'react';
import { Upload, Trash2, Plus, X, RefreshCw } from 'lucide-react';
import { uploadFileToR2 } from '../../utils/r2';

export const ImageUpload: React.FC<{
   label: string;
   value: string;
   onChange: (v: string) => void;
   required?: boolean;
}> = ({ label, value, onChange, required }) => {
   const [isUploading, setIsUploading] = useState(false);

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         setIsUploading(true);
         try {
            const result = await uploadFileToR2(file, 'images');
            if (result?.url) {
               onChange(result.url);
            } else {
               alert("Failed to upload image. Server did not return a URL.");
            }
         } catch (err: any) {
            console.error("Upload error:", err);
            alert("Upload error: " + (err.message || "Unknown error"));
         } finally {
            setIsUploading(false);
         }
      }
   };

   return (
      <div className="mb-6">
         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">
            {label} {required && <span className="text-brand-purple inline-block animate-pulse">*</span>}
         </label>
         <div className="relative group max-w-sm">
            <div className="absolute inset-0 bg-brand-purple/20 blur-2xl rounded-[2.5rem] opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative bg-[#0B0B0F] border-2 border-dashed border-white/5 rounded-[2.5rem] p-8 hover:border-brand-purple/30 transition-all duration-300">
               {isUploading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                     <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-4" />
                     <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest animate-pulse">Uploading to R2...</span>
                  </div>
               ) : value ? (
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-lg">
                     <img src={value} alt="Preview" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <label className="bg-brand-purple text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-purple-600 transition-all shadow-xl shadow-brand-purple/20">
                           Replace Matrix
                           <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                        </label>
                     </div>
                  </div>
               ) : (
                  <label className="flex flex-col items-center justify-center h-48 cursor-pointer group/inner">
                     <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 group-hover/inner:text-brand-purple group-hover/inner:border-brand-purple/30 transition-all duration-300">
                        <Upload size={32} />
                     </div>
                     <span className="mt-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Upload to CF R2</span>
                     <span className="text-[9px] text-gray-700 mt-1 uppercase tracking-tighter">Click to Upload</span>
                     <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                  </label>
               )}
            </div>
         </div>
      </div>
   );
};

export const MultiImageUpload: React.FC<{
   label: string;
   values: string[];
   onChange: (values: string[]) => void;
}> = ({ label, values, onChange }) => {
   const [isUploading, setIsUploading] = useState(false);

   const removeImage = (index: number) => {
      const newValues = [...values];
      newValues.splice(index, 1);
      onChange(newValues);
   }

   const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
         const files = Array.from(e.target.files);
         setIsUploading(true);
         try {
            const urls = await Promise.all(
               files.map(async (file: File) => {
                  const res = await uploadFileToR2(file, 'images');
                  return res?.url || '';
               })
            );
            onChange([...values, ...urls.filter(Boolean)]);
         } catch (err) {
            console.error(err);
         } finally {
            setIsUploading(false);
         }
      }
   };

   return (
      <div className="mb-6">
         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 pl-1">{label}</label>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {values.map((url, idx) => (
               <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/5">
                  <img src={url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                  <button
                     type="button"
                     onClick={() => removeImage(idx)}
                     className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                     <Trash2 size={14} />
                  </button>
               </div>
            ))}
            
            <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-brand-purple/30 transition-all flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden bg-white/[0.02]">
               {isUploading ? (
                  <div className="animate-spin text-brand-purple"><Plus size={24} /></div>
               ) : (
                  <>
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-brand-purple transition-colors">
                        <Plus size={20} />
                     </div>
                     <span className="mt-2 text-[9px] font-black text-gray-600 uppercase tracking-widest">Add More</span>
                  </>
               )}
               <input type="file" className="hidden" multiple accept="image/*" onChange={handleFiles} disabled={isUploading} />
            </label>
         </div>
      </div>
   );
};

export const AudioUpload: React.FC<{
   label: string;
   value: string;
   onChange: (v: string) => void;
   required?: boolean;
   helperText?: string;
}> = ({ label, value, onChange, required, helperText }) => {
   const [isUploading, setIsUploading] = useState(false);

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         setIsUploading(true);
         try {
            const result = await uploadFileToR2(file, 'audio');
            if (result?.url) {
               onChange(result.url);
            }
         } catch (err: any) {
            alert("Upload error: " + (err.message || "Unknown error"));
         } finally {
            setIsUploading(false);
         }
      }
   };

   return (
      <div className="mb-6">
         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">
            {label} {required && <span className="text-brand-purple inline-block animate-pulse">*</span>}
         </label>
         <div className="bg-[#0B0B0F] border border-white/5 rounded-2xl p-4 hover:border-brand-purple/20 transition-all">
            {isUploading ? (
               <div className="flex items-center gap-4 py-2">
                  <RefreshCw className="animate-spin text-brand-purple" size={20} />
                  <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">Uploading to R2...</span>
               </div>
            ) : (
               <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-1 py-1">
                     <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-gray-700"
                        placeholder="Paste URL or upload MP3..."
                     />
                     <label className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all border border-white/5 whitespace-nowrap">
                        Choose MP3
                        <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                     </label>
                  </div>
                  {helperText && <p className="text-[9px] text-gray-600 font-medium px-1 uppercase tracking-wider">{helperText}</p>}
               </div>
            )}
         </div>
      </div>
   );
};

export const FileUpload: React.FC<{
   label: string;
   value: string;
   onChange: (v: string) => void;
   required?: boolean;
   accept?: string;
}> = ({ label, value, onChange, required, accept = "*" }) => {
   const [isUploading, setIsUploading] = useState(false);

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         setIsUploading(true);
         try {
            const result = await uploadFileToR2(file, 'digital-products');
            if (result?.url) {
               onChange(result.url);
            }
         } catch (err: any) {
            alert("Upload error: " + (err.message || "Unknown error"));
         } finally {
            setIsUploading(false);
         }
      }
   };

   return (
      <div className="mb-4">
         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 pl-1">
            {label} {required && <span className="text-brand-purple">*</span>}
         </label>
         <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-2">
            <input
               type="text"
               value={value}
               onChange={(e) => onChange(e.target.value)}
               className="flex-1 bg-transparent px-2 text-xs text-white outline-none"
               placeholder="URL or Uploaded Link"
            />
            <label className="bg-brand-purple hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-all flex items-center gap-2">
               {isUploading ? <RefreshCw className="animate-spin" size={12} /> : <Upload size={12} />}
               {isUploading ? "..." : "Upload"}
               <input type="file" className="hidden" accept={accept} onChange={handleFileChange} />
            </label>
         </div>
      </div>
   );
};

export const VersionAudioUpload: React.FC<{
   onUpload: (url: string) => void;
}> = ({ onUpload }) => {
   const [isUploading, setIsUploading] = useState(false);

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         setIsUploading(true);
         try {
            const result = await uploadFileToR2(file, 'audio');
            if (result?.url) {
               onUpload(result.url);
            }
         } catch (err: any) {
            alert("Upload error: " + (err.message || "Unknown error"));
         } finally {
            setIsUploading(false);
         }
      }
   };

   return (
      <label className="bg-brand-purple hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold uppercase cursor-pointer transition-all flex items-center gap-1">
         {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
         {isUploading ? "..." : "Upload"}
         <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
      </label>
   );
};
