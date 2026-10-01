'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';
import { Clock, CreditCard, Package, ShieldCheck, Truck } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

type CarouselApi = UseEmblaCarouselType[1];

const AUTOPLAY_INTERVAL_MS = 4500;
const INTERACTION_PAUSE_MS = 5000;

const advantages = [
  { icon: Truck, title: 'Entrega Rápida', description: '(1 a 5 dias úteis)' },
  { icon: ShieldCheck, title: 'Compra Segura', description: 'Pagamento na entrega' },
  {
    icon: CreditCard,
    title: 'Até 10x sem Juros',
    description: 'Visa, Master, Elo e Hiper',
  },
  {
    icon: Clock,
    title: 'Montagem Agendada',
    description: 'Feito no dia da entrega',
  },
  { icon: Package, title: 'Retirada Agendada', description: 'Retire no depósito' },
];

function AdvantageCard({
  advantage,
  compact = false,
}: {
  advantage: (typeof advantages)[number];
  compact?: boolean;
}) {
  const Icon = advantage.icon;

  return (
    <div className="group flex h-full flex-col items-center justify-start gap-2 text-center">
      <div
        aria-hidden="true"
        className={`flex items-center justify-center rounded-2xl border border-gray-100 bg-white text-primary shadow-sm transition-all duration-300 group-hover:bg-primary group-hover:text-white ${
          compact ? 'h-10 w-10' : 'h-12 w-12'
        }`}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <div className="w-full min-w-0">
        <h3
          className={`text-balance font-bold uppercase leading-snug tracking-tight text-primary ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {advantage.title}
        </h3>
        <p
          className={`mt-0.5 text-balance font-medium leading-snug text-muted-foreground ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {advantage.description}
        </p>
      </div>
    </div>
  );
}

export function AdvantagesSection() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPausedAfterInteraction, setIsPausedAfterInteraction] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAfterInteraction = useCallback(() => {
    setIsPausedAfterInteraction(true);

    if (interactionTimer.current) {
      clearTimeout(interactionTimer.current);
    }

    interactionTimer.current = setTimeout(() => {
      if (
        window.matchMedia('(max-width: 639px)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        document.visibilityState === 'visible'
      ) {
        carouselApi?.scrollNext();
      }

      setIsPausedAfterInteraction(false);
      interactionTimer.current = null;
    }, INTERACTION_PAUSE_MS);
  }, [carouselApi]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateMobile = () => setIsMobile(mobileQuery.matches);
    const updateMotionPreference = () => setPrefersReducedMotion(reducedMotionQuery.matches);

    updateMobile();
    updateMotionPreference();
    mobileQuery.addEventListener('change', updateMobile);
    reducedMotionQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mobileQuery.removeEventListener('change', updateMobile);
      reducedMotionQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const updateActiveSlide = () => setActiveSlide(carouselApi.selectedScrollSnap());
    updateActiveSlide();
    carouselApi.on('select', updateActiveSlide);
    carouselApi.on('reInit', updateActiveSlide);

    return () => {
      carouselApi.off('select', updateActiveSlide);
      carouselApi.off('reInit', updateActiveSlide);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (
      !carouselApi ||
      !isMobile ||
      prefersReducedMotion ||
      isPausedAfterInteraction
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        carouselApi.scrollNext();
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [
    carouselApi,
    isMobile,
    isPausedAfterInteraction,
    prefersReducedMotion,
  ]);

  useEffect(() => {
    return () => {
      if (interactionTimer.current) {
        clearTimeout(interactionTimer.current);
      }
    };
  }, []);

  const goToSlide = (index: number) => {
    pauseAfterInteraction();
    carouselApi?.scrollTo(index, prefersReducedMotion);
  };

  return (
    <section className="border-y border-gray-100 bg-gray-50/50 py-4 sm:py-8 md:py-10">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        <Carousel
          aria-label="Benefícios da loja"
          className="sm:hidden"
          onFocusCapture={pauseAfterInteraction}
          onPointerDownCapture={pauseAfterInteraction}
          onPointerMoveCapture={pauseAfterInteraction}
          onPointerUpCapture={pauseAfterInteraction}
          onWheelCapture={pauseAfterInteraction}
          opts={{ align: 'start', loop: true, slidesToScroll: 1 }}
          setApi={setCarouselApi}
        >
          <CarouselContent className="ml-0 gap-3">
            {advantages.map((advantage, index) => (
              <CarouselItem
                aria-label={`${index + 1} de ${advantages.length}: ${advantage.title}`}
                className="basis-[calc(50%_-_0.375rem)] pl-0"
                key={advantage.title}
              >
                <AdvantageCard advantage={advantage} compact />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div
            aria-label="Controles do carrossel"
            className="mt-3 flex items-center justify-center gap-3"
            role="group"
          >
            <div className="flex items-center gap-1.5">
              {advantages.map((advantage, index) => (
                <button
                  aria-current={activeSlide === index ? 'true' : undefined}
                  aria-label={`Mostrar benefício: ${advantage.title}`}
                  className={`flex size-6 items-center justify-center rounded-full before:block before:h-2 before:w-2 before:rounded-full before:bg-primary/30 before:content-[''] before:transition-[width,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    activeSlide === index ? 'before:w-4 before:bg-primary' : ''
                  }`}
                  key={advantage.title}
                  onClick={() => goToSlide(index)}
                  type="button"
                />
              ))}
            </div>

          </div>
        </Carousel>

        <div className="hidden grid-cols-2 gap-x-4 gap-y-8 sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {advantages.map((advantage) => (
            <AdvantageCard advantage={advantage} key={advantage.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
