import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import {
  DAY_LABELS_JA,
  DEFAULT_PERIOD_TIMES,
  NUM_PERIODS,
  TIMETABLE_DAYS,
} from '../constants/taskTypes';
import type { PeriodTime, Subject } from '../types/Task';

interface Props {
  subjectsByCell: Map<string, Subject>;
  periodTimes: Record<number, PeriodTime>;
  theme: Theme;
  onPressCell: (day: number, period: number) => void;
  onPressPeriod: (period: number) => void;
}

export function TimetableGrid({
  subjectsByCell,
  periodTimes,
  theme,
  onPressCell,
  onPressPeriod,
}: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.bgElevated, borderColor: theme.separator }]}>
      <View style={styles.headerRow}>
        <View style={[styles.cornerCell, { borderColor: theme.separator }]} />
        {TIMETABLE_DAYS.map((d) => (
          <View
            key={d}
            style={[styles.dayHeader, { borderColor: theme.separator }]}
          >
            <Text style={[styles.dayHeaderText, { color: theme.textSecondary }]}>
              {DAY_LABELS_JA[d]}
            </Text>
          </View>
        ))}
      </View>

      {Array.from({ length: NUM_PERIODS }, (_, i) => i + 1).map((p) => {
        const pt = periodTimes[p] ?? DEFAULT_PERIOD_TIMES[p];
        return (
          <View key={p} style={styles.row}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                onPressPeriod(p);
              }}
              style={[
                styles.periodCell,
                {
                  borderColor: theme.separator,
                  backgroundColor: theme.bgSecondary,
                },
              ]}
            >
              <Text style={[styles.periodNum, { color: theme.text }]}>{p}</Text>
              <Text style={[styles.periodTime, { color: theme.textTertiary }]}>{pt.start}</Text>
              <Text style={[styles.periodTime, { color: theme.textTertiary }]}>{pt.end}</Text>
            </Pressable>
            {TIMETABLE_DAYS.map((d) => {
              const sub = subjectsByCell.get(`${d}-${p}`);
              if (sub) {
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onPressCell(d, p);
                    }}
                    style={[
                      styles.cell,
                      styles.cellFilled,
                      {
                        backgroundColor: sub.color,
                        borderColor: theme.separator,
                      },
                    ]}
                  >
                    <Text style={styles.cellText} numberOfLines={3}>
                      {sub.name}
                    </Text>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    onPressCell(d, p);
                  }}
                  style={[
                    styles.cell,
                    styles.cellEmpty,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.separator,
                    },
                  ]}
                >
                  <Ionicons name="add" size={16} color={theme.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
  },
  cornerCell: {
    width: 56,
    height: 32,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeader: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  periodCell: {
    width: 56,
    minHeight: 80,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  periodNum: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  periodTime: {
    fontSize: 9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cell: {
    flex: 1,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellFilled: {},
  cellEmpty: {},
  cellText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
