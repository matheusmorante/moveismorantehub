import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface PickupIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

const PickupIcon = ({ size = 14, color = '#ffffff', style }: PickupIconProps) => (
  <Image
    source={require('../../../assets/pickup-hands-parcel-white.png')}
    resizeMode="contain"
    accessibilityElementsHidden
    importantForAccessibility="no"
    style={[{ width: size, height: size, tintColor: color }, style]}
  />
);

export default PickupIcon;
