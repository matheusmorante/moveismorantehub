"use client"

import { motion } from "framer-motion"
import { 
  Truck, 
  Wrench, 
  CreditCard, 
  Tags, 
  HeartHandshake,
  MessageCircle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const features = [
  { icon: Truck, title: "Entrega rápida" },
  { icon: Wrench, title: "Opção de montagem" },
  { icon: CreditCard, title: "Pagamento facilitado" },
  { icon: Tags, title: "Preços acessíveis" },
  { icon: HeartHandshake, title: "Atendimento de qualidade" },
]

const stats = [
  { value: "2017", label: "Desde" },
  { value: "570m²", label: "De Loja" },
  { value: "7", label: "Colaboradores" },
]

export function AboutSection() {
  return (
    <section id="sobre" className="w-full bg-[#0A192F] text-white py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Content Left */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Sobre a <span className="text-[#FBBF24]">Móveis Morante</span>
              </h2>
              <div className="w-20 h-1 bg-[#FBBF24] rounded-full"></div>
            </div>

            <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
              <p>
                A Móveis Morante é uma empresa localizada em Colombo, na região metropolitana de Curitiba, fundada por Rosilene Morante. A história da empresa começou em 2017, em um espaço de apenas 150m², trabalhando inicialmente com móveis usados.
              </p>
              <p>
                Com dedicação, crescimento constante e foco no atendimento ao cliente, a empresa expandiu suas operações e hoje conta com um espaço de 570m², oferecendo móveis novos e salvados para diferentes necessidades e estilos.
              </p>
              <p>
                Atualmente, a Móveis Morante conta com uma equipe de 7 colaboradores comprometidos em oferecer um atendimento de qualidade, preços acessíveis e soluções práticas para facilitar a vida do cliente.
              </p>
              <p className="font-medium text-white">
                O principal objetivo da empresa é tornar a aquisição de móveis mais simples e acessível, oferecendo rapidez na entrega, opção de montagem, facilidade no pagamento e o atendimento que todo cliente merece.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/#produtos" 
                className="bg-[#FBBF24] text-[#0A192F] font-bold py-3 px-8 rounded-full hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
              >
                Ver Produtos <ArrowRight className="h-5 w-5" />
              </Link>
              <a 
                href="https://wa.me/5541997493547" 
                target="_blank" 
                rel="noreferrer"
                className="bg-transparent border-2 border-gray-400 text-white font-bold py-3 px-8 rounded-full hover:border-[#FBBF24] hover:text-[#FBBF24] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
              </a>
            </div>
          </motion.div>

          {/* Visuals Right */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] w-full">
              <Image 
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop" 
                alt="Loja Móveis Morante"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-transparent to-transparent opacity-80" />
            </div>

            {/* Stats Overlay */}
            <div className="absolute -bottom-8 md:-bottom-12 left-0 right-0 flex justify-center z-10 px-4">
              <div className="bg-white rounded-2xl shadow-xl flex items-center divide-x divide-gray-100 p-4 w-full max-w-md">
                {stats.map((stat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center text-center px-2">
                    <span className="text-[#0A192F] text-xl md:text-2xl font-black">{stat.value}</span>
                    <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-32 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div 
                key={idx} 
                className="bg-[#112240] rounded-2xl p-6 flex flex-col items-center text-center gap-4 hover:-translate-y-2 transition-transform duration-300 shadow-lg border border-white/5 group"
              >
                <div className="h-14 w-14 rounded-full bg-[#0A192F] flex items-center justify-center text-[#FBBF24] group-hover:bg-[#FBBF24] group-hover:text-[#0A192F] transition-colors duration-300">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-gray-200 text-sm md:text-base leading-tight">
                  {feature.title}
                </h3>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
