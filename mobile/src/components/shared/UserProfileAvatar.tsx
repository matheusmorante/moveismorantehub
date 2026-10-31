import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

interface UserProfileAvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  size: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export const getUserInitials = (name?: string | null) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';

  const first = parts[0].charAt(0);
  const last =
    parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0].charAt(1) || first;
  return `${first}${last}`.toUpperCase();
};

export const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  name,
  imageUrl,
  size,
  backgroundColor = '#2563eb',
  textColor = '#ffffff',
  borderColor,
  borderWidth = 0,
}) => {
  const normalizedImageUrl = imageUrl?.trim();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [normalizedImageUrl]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {normalizedImageUrl && /^https:\/\//i.test(normalizedImageUrl) && !imageFailed ? (
        <Image
          source={{ uri: normalizedImageUrl }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessible={false}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Text
          accessible={false}
          style={{
            color: textColor,
            fontSize: Math.max(12, Math.round(size * 0.38)),
            fontWeight: '900',
          }}
        >
          {getUserInitials(name)}
        </Text>
      )}
    </View>
  );
};
