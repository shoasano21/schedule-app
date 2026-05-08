import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { END_HOUR, HOUR_HEIGHT, START_HOUR, formatHour, isToday, toISODate } from '../utils/date';
import { layoutDayEvents } from '../utils/layout';
import { EventBlock } from './EventBlock';
import { NowLine } from './NowLine';

const TIME_AXIS_WIDTH = 52;

interface Props {
  weekDates: Date[];
  eventsByDate: Map<string, EventItem[]>;
  onPressEvent: (event: EventItem) => void;
  onPressEmpty: (date: string, hour: number) => void;
  theme: Theme;
  nowLineTop: number;
  nowLineVisible: boolean;
}

export function TimeGrid({
  weekDates,
  eventsByDate,
  onPressEvent,
  onPressEmpty,
  theme,
  nowLineTop,
  nowLineVisible,
}: Props) {
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    []
  );
  const slotHours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  const handleSlotPress = (date: string, hour: number) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPressEmpty(date, hour);
  };

  return (
    <View style={[styles.wrap, { height: totalHeight + 40 }]}>
      <View style={[styles.timeAxis, { width: TIME_AXIS_WIDTH, height: totalHeight + 24 }]}>
        {hours.map((h) => (
          <View key={h} style={[styles.hourLabel, { top: (h - START_HOUR) * HOUR_HEIGHT - 7 }]}>
            <Text style={[styles.hourText, { color: theme.textTertiary }]}>{formatHour(h)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.gridArea}>
        {hours.map((h) => (
          <View
            key={`h-${h}`}
            style={[
              styles.hourLine,
              {
                top: (h - START_HOUR) * HOUR_HEIGHT,
                backgroundColor: theme.separator,
              },
            ]}
            pointerEvents="none"
          />
        ))}

        <View style={styles.columnsRow}>
          {weekDates.map((d, idx) => {
            const dateStr = toISODate(d);
            const today = isToday(dateStr);
            const list = eventsByDate.get(dateStr) ?? [];
            const layout = layoutDayEvents(list);
            return (
              <View
                key={dateStr}
                style={[
                  styles.dayColumn,
                  {
                    backgroundColor: today ? theme.todayBg : 'transparent',
                    borderLeftColor: theme.separator,
                    borderLeftWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {slotHours.map((h) => (
                  <Pressable
                    key={`slot-${h}`}
                    onPress={() => handleSlotPress(dateStr, h)}
                    style={({ pressed, hovered }: any) => [
                      styles.slot,
                      {
                        top: (h - START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                        backgroundColor: pressed
                          ? theme.accentBg
                          : hovered
                          ? theme.accentBg
                          : 'transparent',
                      },
                    ]}
                  />
                ))}
                {layout.map(({ event, columnIndex, columnCount }) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    theme={theme}
                    onPress={onPressEvent}
                    columnLeft={`${(columnIndex / columnCount) * 100}%` as `${number}%`}
                    columnWidth={`${(1 / columnCount) * 100}%` as `${number}%`}
                  />
                ))}
                {today && nowLineVisible ? <NowLine topPx={nowLineTop} theme={theme} /> : null}
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
    flexDirection: 'row',
    paddingTop: 8,
  },
  timeAxis: {
    position: 'relative',
  },
  hourLabel: {
    position: 'absolute',
    right: 8,
    height: 14,
    justifyContent: 'center',
  },
  hourText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  gridArea: {
    flex: 1,
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
