declare module 'expo-notifications' {
  export function setNotificationHandler(handler: any): void;
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(options?: any): Promise<{ data: string }>;
  export function scheduleNotificationAsync(options: any): Promise<string>;
  export function setNotificationChannelAsync(id: string, channel: any): Promise<any>;
}
