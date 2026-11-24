import pickupParcelIcon from '@/assets/pickup-hands-parcel-white.png';

interface PickupIconProps {
  className?: string;
  white?: boolean;
}

const PickupIcon = ({ className = '', white = false }: PickupIconProps) => (
  <span
    aria-hidden="true"
    className={`inline-block ${className}`}
    style={{
      backgroundColor: white ? '#fff' : 'currentColor',
      maskImage: `url(${pickupParcelIcon})`,
      maskPosition: 'center',
      maskRepeat: 'no-repeat',
      maskSize: 'contain',
      WebkitMaskImage: `url(${pickupParcelIcon})`,
      WebkitMaskPosition: 'center',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
    }}
  />
);

export default PickupIcon;
