import { AboutSection } from "@/components/sections/about-section"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sobre Nós | Móveis Morante",
  description: "Conheça a história da Móveis Morante, uma empresa dedicada a oferecer qualidade, conforto e tradição em móveis desde 2017.",
}

export default function SobrePage() {
  return (
    <div className="flex flex-col">
      {/* Banner de Título da Página */}
      <section className="bg-primary py-20 text-center">
        <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
          <h1 className="text-4xl md:text-6xl font-bold text-white italic">Nossa <span className="text-accent">História</span></h1>
          <p className="text-white/70 mt-4 text-lg max-w-2xl mx-auto">
            Tradição, confiança e o compromisso de transformar sua casa em um verdadeiro lar.
          </p>
        </div>
      </section>

      <AboutSection />
      
      {/* Seção adicional para preencher a página se necessário */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 text-center space-y-8">
          <h2 className="text-3xl font-bold text-primary italic">Venha nos Visitar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-xl h-80 relative">
               <img 
                src="https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=800" 
                alt="Nossa Loja" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="text-left space-y-4">
              <p className="text-lg text-muted-foreground">
                Estamos localizados em uma região estratégica de Colombo, com as melhores opções de móveis para sua casa.
              </p>
              <div className="space-y-2">
                <p className="font-bold text-primary">Endereço:</p>
                <p className="text-muted-foreground">Rua Cascavel, 306, Guaraituba, Colombo - PR</p>
                <p className="font-bold text-primary mt-4">Horário de Atendimento:</p>
                <p className="text-muted-foreground">Segunda a Sexta: 09h às 18h<br />Sábado: 09h às 17h</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
