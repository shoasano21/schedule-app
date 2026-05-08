import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { Theme } from '../constants/colors';
import { COLOR_IDS, type ColorId } from '../types/Event';

interface Props {
  value: ColorId;
  onChange: (id: ColorId) => void;
  theme: Theme;
}

export function ColorPicker({ value, onChange, theme }: Props) {
  return (
    <View style={styles.wrap}>
      {COLOR_IDS.map((id) => {
        const c = theme.palette[id];
        const selected = value === id;
        return (
          <Pressable
            key={id}
            hitSlop={6}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(id);
            }}
            style={[
              styles.outer,
              selected && {
                borderColor: theme.bg,
                shadowColor: c.fg,
              },
            ]}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: c.fg },
                selected && { transform: [{ scale: 1.1 }] },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
