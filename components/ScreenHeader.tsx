import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';

interface Props {
  title: string;
  theme: Theme;
  onAdd?: () => void;
  rightExtra?: React.ReactNode;
  bottom?: React.ReactNode;
}

export function ScreenHeader({ title, theme, onAdd, rightExtra, bottom }: Props) {
  const press = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd?.();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <View style={styles.rightWrap}>
          {rightExtra}
          {onAdd ? (
            <Pressable
              onPress={press}
              hitSlop={10}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {bottom}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
