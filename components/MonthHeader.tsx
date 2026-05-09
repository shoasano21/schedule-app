import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  label: string;
  theme: Theme;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthHeader({ label, theme, onPrev, onNext }: Props) {
  const press = (cb: () => void) => () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    cb();
  };

  return (
    <View
      style={{
        borderBottomColor: theme.separator,
        borderBottomWidth: StyleSheet.hairlineWidth,
      }}
    >
      <ScreenHeader
        title="月間スケジュール"
        theme={theme}
        bottom={
          <View style={styles.navRow}>
            <Pressable onPress={press(onPrev)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.accent} />
            </Pressable>
            <Text style={[styles.navLabel, { color: theme.text }]}>{label}</Text>
            <Pressable onPress={press(onNext)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.accent} />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 140,
    textAlign: 'center',
  },
});
