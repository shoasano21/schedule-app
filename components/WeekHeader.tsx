import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import { WEEKDAY_JA, isToday, toISODate } from '../utils/date';

interface Props {
  weekDates: Date[];
  label: string;
  weekOffset: number;
  datesWithEvents: Set<string>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  theme: Theme;
}

export function WeekHeader({
  weekDates,
  label,
  weekOffset,
  datesWithEvents,
  onPrev,
  onNext,
  onToday,
  theme,
}: Props) {
  const press = (cb: () => void) => () => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    cb();
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, borderBottomColor: theme.separator }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: theme.text }]}>週間スケジュール</Text>
        <Text style={[styles.hint, { color: theme.textTertiary }]}>時間帯をタップして追加</Text>
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={press(onPrev)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.accent} />
        </Pressable>
        <Pressable onPress={press(onToday)} hitSlop={10} style={styles.navLabelWrap}>
          <Text
            style={[
              styles.navLabel,
              { color: weekOffset === 0 ? theme.accent : theme.text },
            ]}
          >
            {label}
          </Text>
        </Pressable>
        <Pressable onPress={press(onNext)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.accent} />
        </Pressable>
      </View>

      <View style={styles.weekStrip}>
        <View style={{ width: 52 }} />
        <View style={styles.daysRow}>
          {weekDates.map((d, idx) => {
            const dateStr = toISODate(d);
            const today = isToday(dateStr);
            const hasEvents = datesWithEvents.has(dateStr);
            return (
              <View key={dateStr} style={styles.dayCell}>
                <Text
                  style={[
                    styles.dow,
                    {
                      color:
                        idx === 5
                          ? theme.accent
                          : idx === 6
                          ? theme.palette.red.fg
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {WEEKDAY_JA[idx]}
                </Text>
                <View
                  style={[
                    styles.dayNumWrap,
                    today && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      { color: today ? '#fff' : theme.text },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: hasEvents ? theme.accent : 'transparent',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navLabelWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 160,
    textAlign: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
  },
  dow: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
