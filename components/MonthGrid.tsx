import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { MonthCell } from '../hooks/useMonth';
import type { EventItem } from '../types/Event';

interface Props {
  cells: MonthCell[];
  baseMonth: Date;
  eventsByDate: Map<string, EventItem[]>;
  theme: Theme;
  onPressDay: (iso: string) => void;
  onPressEvent: (event: EventItem) => void;
}

const MAX_CHIPS_PER_CELL = 3;

export function MonthGrid({
  cells,
  baseMonth,
  eventsByDate,
  theme,
  onPressDay,
  onPressEvent,
}: Props) {
  const rows = useMemo(() => {
    const out: MonthCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cells]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bgSecondary }]}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((cell, colIdx) => (
            <DayCell
              key={cell.iso}
              cell={cell}
              events={eventsByDate.get(cell.iso) ?? []}
              theme={theme}
              isLastCol={colIdx === 6}
              isLastRow={rowIdx === rows.length - 1}
              onPressDay={onPressDay}
              onPressEvent={onPressEvent}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function DayCell({
  cell,
  events,
  theme,
  isLastCol,
  isLastRow,
  onPressDay,
  onPressEvent,
}: {
  cell: MonthCell;
  events: EventItem[];
  theme: Theme;
  isLastCol: boolean;
  isLastRow: boolean;
  onPressDay: (iso: string) => void;
  onPressEvent: (event: EventItem) => void;
}) {
  const dimmed = !cell.isCurrentMonth;
  const numColor = cell.isToday
    ? '#fff'
    : cell.dow === 0
    ? theme.palette.red.fg
    : cell.dow === 6
    ? theme.accent
    : theme.text;
  const visibleEvents = events.slice(0, MAX_CHIPS_PER_CELL);
  const overflowCount = events.length - visibleEvents.length;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPressDay(cell.iso);
      }}
      style={({ pressed, hovered }: any) => [
        styles.cell,
        {
          backgroundColor: pressed
            ? theme.accentBg
            : hovered
            ? theme.accentBg
            : cell.isCurrentMonth
            ? theme.bg
            : theme.bgSecondary,
          borderRightColor: theme.separator,
          borderBottomColor: theme.separator,
          borderRightWidth: isLastCol ? 0 : StyleSheet.hairlineWidth,
          borderBottomWidth: isLastRow ? 0 : StyleSheet.hairlineWidth,
          opacity: dimmed ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.headRow}>
        <View
          style={[
            styles.dayNumWrap,
            cell.isToday && { backgroundColor: theme.accent },
          ]}
        >
          <Text
            style={[
              styles.dayNum,
              { color: numColor },
            ]}
          >
            {cell.date.getDate()}
          </Text>
        </View>
      </View>

      <View style={styles.chipsCol}>
        {visibleEvents.map((ev) => {
          const c = theme.palette[ev.color];
          return (
            <Pressable
              key={ev.id}
              onPress={(e) => {
                e.stopPropagation?.();
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressEvent(ev);
              }}
              style={[
                styles.chip,
                { backgroundColor: c.bg, borderLeftColor: c.fg },
              ]}
            >
              <Text
                style={[styles.chipText, { color: c.fg }]}
                numberOfLines={1}
              >
                {ev.title}
              </Text>
            </Pressable>
          );
        })}
        {overflowCount > 0 ? (
          <Text style={[styles.overflow, { color: theme.textTertiary }]}>
            +{overflowCount} 件
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 92,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  dayNumWrap: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chipsCol: {
    gap: 2,
  },
  chip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    borderLeftWidth: 2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  overflow: {
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 2,
    marginTop: 1,
  },
});
