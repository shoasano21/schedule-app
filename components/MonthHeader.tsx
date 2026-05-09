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
  onSearch?: () => void;
  onShare?: () => void;
  viewingName?: string | null;
}

export function MonthHeader({ label, theme, onPrev, onNext, onSearch, onShare, viewingName }: Props) {
  const press = (cb: () => void) => () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    cb();
  };

  const isShared = !!viewingName;

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
        rightExtra={
          <View style={styles.rightRow}>
            {onShare ? (
              <Pressable
                onPress={press(onShare)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    backgroundColor: isShared ? theme.accentBg : theme.bgSecondary,
                    borderColor: isShared ? theme.accent : theme.separator,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={isShared ? 'people' : 'people-outline'}
                  size={18}
                  color={isShared ? theme.accent : theme.text}
                />
                {isShared ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
              </Pressable>
            ) : null}
            {onSearch ? (
              <Pressable
                onPress={press(onSearch)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.separator,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={theme.text} />
              </Pressable>
            ) : null}
          </View>
        }
        bottom={
          <>
            <View style={styles.navRow}>
              <Pressable onPress={press(onPrev)} hitSlop={10} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={theme.accent} />
              </Pressable>
              <Text style={[styles.navLabel, { color: theme.text }]}>{label}</Text>
              <Pressable onPress={press(onNext)} hitSlop={10} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={theme.accent} />
              </Pressable>
            </View>
            {isShared ? (
              <Pressable
                onPress={onShare ? press(onShare) : undefined}
                style={[styles.viewingBar, { backgroundColor: theme.accentBg }]}
              >
                <Ionicons name="eye-outline" size={13} color={theme.accent} />
                <Text style={[styles.viewingText, { color: theme.accent }]} numberOfLines={1}>
                  {viewingName} さんのスケジュールを表示中
                </Text>
                <Ionicons name="chevron-down" size={13} color={theme.accent} />
              </Pressable>
            ) : null}
          </>
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
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  viewingText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
});
