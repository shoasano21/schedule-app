import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import { ScreenHeader } from './ScreenHeader';

export type ViewMode = 'month' | 'day';

interface Props {
  label: string;
  theme: Theme;
  onPrev: () => void;
  onNext: () => void;
  onSearch?: () => void;
  onShare?: () => void;
  viewingName?: string | null;
  countdown?: { title: string; days: number } | null;
  viewMode?: ViewMode;
  onChangeViewMode?: (mode: ViewMode) => void;
}

export function MonthHeader({
  label,
  theme,
  onPrev,
  onNext,
  onSearch,
  onShare,
  viewingName,
  countdown,
  viewMode = 'month',
  onChangeViewMode,
}: Props) {
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
        title={viewMode === 'day' ? '日表示' : '月間スケジュール'}
        theme={theme}
        rightExtra={
          <View style={styles.rightRow}>
            {onChangeViewMode ? (
              <View style={[styles.viewToggle, { backgroundColor: theme.bgSecondary, borderColor: theme.separator }]}>
                <Pressable
                  onPress={press(() => onChangeViewMode('month'))}
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'month' && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewToggleText,
                      { color: viewMode === 'month' ? '#fff' : theme.text },
                    ]}
                  >
                    月
                  </Text>
                </Pressable>
                <Pressable
                  onPress={press(() => onChangeViewMode('day'))}
                  style={[
                    styles.viewToggleBtn,
                    viewMode === 'day' && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewToggleText,
                      { color: viewMode === 'day' ? '#fff' : theme.text },
                    ]}
                  >
                    日
                  </Text>
                </Pressable>
              </View>
            ) : null}
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
            {countdown ? (
              <View style={[styles.countdownBar, { backgroundColor: theme.palette.orange.bg }]}>
                <Ionicons name="flag" size={13} color={theme.palette.orange.fg} />
                <Text
                  style={[styles.countdownTitle, { color: theme.palette.orange.fg }]}
                  numberOfLines={1}
                >
                  {countdown.title}
                </Text>
                <Text style={[styles.countdownDays, { color: theme.palette.orange.fg }]}>
                  {countdown.days === 0 ? '今日' : `あと ${countdown.days} 日`}
                </Text>
              </View>
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
    gap: 6,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
  },
  viewToggleBtn: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    alignItems: 'center',
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '700',
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
  countdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 6,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  countdownTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  countdownDays: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
