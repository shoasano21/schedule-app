import React, { useEffect } from 'react';
import {
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  children: React.ReactNode;
  maxHeightRatio?: number;
}

export function BottomSheet({
  visible,
  onClose,
  theme,
  children,
  maxHeightRatio = 0.92,
}: Props) {
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;
  const maxH = screenH * maxHeightRatio;

  const translateY = useSharedValue(maxH);
  const overlay = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(overlay);
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      overlay.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withTiming(maxH, {
        duration: 240,
        easing: Easing.in(Easing.cubic),
      });
      overlay.value = withTiming(0, { duration: 200 });
    }
  }, [visible, maxH, translateY, overlay]);

  // キーボード開閉に合わせてシートを押し上げる
  useEffect(() => {
    if (!visible) {
      keyboardOffset.value = 0;
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates?.height ?? 0;
      // safe-area の bottom inset 分は元から余白があるので差し引く
      const offset = Math.max(0, h - insets.bottom);
      keyboardOffset.value = withTiming(offset, {
        duration: e.duration ?? 250,
        easing: Easing.out(Easing.cubic),
      });
    };
    const onHide = (e: KeyboardEvent) => {
      keyboardOffset.value = withTiming(0, {
        duration: e.duration ?? 250,
        easing: Easing.in(Easing.cubic),
      });
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [visible, insets.bottom, keyboardOffset]);

  const sheetStyle = useAnimatedStyle(() => ({
    bottom: keyboardOffset.value,
    maxHeight: maxH - keyboardOffset.value,
    transform: [{ translateY: translateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgElevated,
              paddingBottom: insets.bottom + 16,
              shadowColor: theme.shadow,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handleWrap]}>
            <View style={[styles.handle, { backgroundColor: theme.separatorStrong }]} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
});
