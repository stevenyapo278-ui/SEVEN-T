import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Check, CheckCheck, MoreVertical, Phone, Video, Paperclip, Smile } from "lucide-react";

const messages = [
  { id: 1, text: "Bonjour, je voudrais commander un pack de 3 montres connectées.", sender: "client", time: "14:02" },
  { id: 2, text: "Bonjour ! 👋 C'est noté. Nous avons actuellement le modèle SEVEN-X en stock (Noir et Argent). Quelle couleur préférez-vous ?", sender: "ai", time: "14:02" },
  { id: 3, text: "2 Noires et 1 Argent s'il vous plaît.", sender: "client", time: "14:03" },
  { id: 4, text: "Parfait ! 📝\n\n2x SEVEN-X Noir\n1x SEVEN-X Argent\n\nLe total est de 45 000 FCFA. Puis-je avoir votre adresse de livraison ?", sender: "ai", time: "14:03" },
  { id: 5, text: "Immeuble Massa, Plateau, Abidjan.", sender: "client", time: "14:04" },
  { id: 6, text: "Merci ! Votre commande n°ST-892 est validée. ✅\n\nUn livreur vous contactera d'ici 1h. À bientôt !", sender: "ai", time: "14:04" },
];

const WhatsAppSimulator = () => {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < messages.length) {
      const timer = setTimeout(() => {
        setVisibleMessages((prev) => [...prev, messages[currentIndex]]);
        setCurrentIndex((prev) => prev + 1);
      }, currentIndex === 0 ? 1000 : 2000);
      return () => clearTimeout(timer);
    } else {
      // Reset after 5 seconds to loop
      const resetTimer = setTimeout(() => {
        setVisibleMessages([]);
        setCurrentIndex(0);
      }, 5000);
      return () => clearTimeout(resetTimer);
    }
  }, [currentIndex]);

  return (
    <div className="w-full max-w-[380px] mx-auto h-[600px] bg-[#0b141a] rounded-[2.5rem] border-[8px] border-[#222] shadow-2xl overflow-hidden flex flex-col font-sans relative">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#222] rounded-b-2xl z-20" />
      
      {/* Header */}
      <div className="bg-[#202c33] p-4 pt-10 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-lg">
          7T
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm">SEVEN T AI Assistant</h4>
          <p className="text-[#8696a0] text-xs flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00a884]"></span> en ligne
          </p>
        </div>
        <div className="flex items-center gap-4 text-[#8696a0]">
          <Video size={18} />
          <Phone size={18} />
          <MoreVertical size={18} />
        </div>
      </div>

      {/* Chat Area */}
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
        style={{ backgroundSize: '400px' }}
      >
        <AnimatePresence initial={false}>
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${msg.sender === "client" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl relative text-sm shadow-md ${
                  msg.sender === "client" 
                    ? "bg-[#202c33] text-[#e9edef] rounded-tl-none" 
                    : "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-[#8696a0]">{msg.time}</span>
                  {msg.sender === "ai" && <CheckCheck size={14} className="text-[#53bdeb]" />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Input */}
      <div className="bg-[#202c33] p-3 flex items-center gap-3">
        <div className="flex items-center gap-3 text-[#8696a0]">
          <Smile size={24} />
          <Paperclip size={24} />
        </div>
        <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-[#8696a0] text-sm">
          Message
        </div>
        <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
          <Send size={18} />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;
