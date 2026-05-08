import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { HOUR_HEIGHT, START_HOUR, durationHours } from '../utils/date';

interface Props {
  event: EventItem;
  theme: Theme;
  onPress: (event: EventItem) => void;
  columnLeft?: number | `${number}%`;
  columnWidth?: number | `${number}%`;
}

export function EventBlock({ event, theme, onPress, columnLeft, columnWidth }: Props) {
  const colors = theme.palette[event.color];
  const duration = durationHours(event.startH, event.endH);
  const top = (event.startH - START_HOUR) * HOUR_HEIGHT + 1.5;
  const height = Math.max(20, duration * HOUR_HEIGHT - 3);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  }, [scale]);

  const showSub = height >= 56;
  const showTime = height >= 34;

  return (
    <Animated.View
      style={[
        styles.outer,
        animatedStyle,
        {
          top,
          height,
          left: columnLeft ?? 4,
          width: columnWidth ?? undefined,
          right: columnWidth == null ? 4 : undefined,
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(event)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.block,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: colors.fg }]} />
        <View style={styles.content}>
          <Text
            numberOfLines={showSub ? 1 : 2}
            style={[styles.title, { color: colors.fg }]}
          >
            {event.title}
          </Text>
          {showSub && event.location ? (
            <Text numberOfLines={1} style={[styles.sub, { color: colors.fg }]}>
              {event.location}
            </Text>
          ) : null}
          {showTime ? (
            <Text style={[styles.time, { color: colors.fg }]}>
              {`${pad2(event.startH)}:00 — ${pad2(event.endH)}:00`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
  },
  block: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  sub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.75,
  },
  time: {
    marginTop: 2,
    fontSize: 10.5,
    fontWeight: '400',
    opacity: 0.6,
  },
});
