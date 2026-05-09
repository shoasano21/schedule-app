import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * 集中モード: 起動中はアプリ内バナー/サウンドを抑制する。
 * (システムの DND ではなく、expo-notifications の前景表示挙動を変える)
 */
export function useFocusMode() {
  const [active, setActive] = useState(false);

  const enter = useCallback(() => {
    if (!supported) {
      setActive(true);
      return;
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    setActive(true);
  }, []);

  const exit = useCallback(() => {
    if (!supported) {
      setActive(false);
      return;
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    setActive(false);
  }, []);

  return { active, enter, exit };
}
