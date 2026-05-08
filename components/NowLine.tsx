import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Theme } from '../constants/colors';

interface Props {
  topPx: number;
  theme: Theme;
}

export function NowLine({ topPx, theme }: Props) {
  // Clamp so the dot (height 8, centered on a 2-tall wrap) doesn't extend
  // above the parent column top edge, where it would get visually cut off.
  const safeTop = Math.max(4, topPx);
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: safeTop }]}>
      <View style={[styles.dot, { backgroundColor: theme.nowLine }]} />
      <View style={[styles.line, { backgroundColor: theme.nowLine }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  line: {
    flex: 1,
    height: 2,
  },
});
