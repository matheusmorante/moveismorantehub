"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { generateWhatsAppLink } from "@/services/whatsapp"
import Image from "next/image"

export function WhatsAppButton() {
  const handleClick = () => {
    const link = generateWhatsAppLink("Olá! Gostaria de saber mais sobre os produtos da Móveis Morante.")
    window.open(link, "_blank")
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Balão de Fala do Seu Lizandro */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="bg-white border shadow-xl rounded-2xl p-3 flex items-center gap-3 relative mr-2 pointer-events-auto"
      >
        <div className="relative h-8 w-8 rounded-full overflow-hidden border border-primary/10 flex-shrink-0 bg-gray-50">
          <Image 
            src="/images/avatar-morante.png" 
            alt="Seu Lizandro"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-primary leading-none mb-1">Seu Lizandro</span>
          <p className="text-xs text-gray-600 font-medium whitespace-nowrap">Olá! Precisa de ajuda?</p>
        </div>
        {/* Triângulo do Balão */}
        <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white border-r border-b rotate-45"></div>
      </motion.div>

      <motion.div
        className="pointer-events-auto"
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 3.5, // Total 4 segundos (0.5 animando + 3.5 parado)
          ease: "easeInOut"
        }}
      >
        <Button
          onClick={handleClick}
          className="h-14 w-14 rounded-full shadow-2xl bg-[#25D366] hover:bg-[#128C7E] text-white p-0 flex items-center justify-center hover:scale-110 transition-transform"
          title="Falar no WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.978l-1.127 4.117 4.205-1.103a7.86 7.86 0 0 0 3.668.901h.001c4.367 0 7.926-3.558 7.93-7.93a7.85 7.85 0 0 0-2.33-5.54M7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
        </Button>
      </motion.div>
    </div>
  )
}
