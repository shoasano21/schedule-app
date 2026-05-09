import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { END_HOUR, HOUR_HEIGHT, START_HOUR, formatHour } from '../utils/date';
import { NowLine } from './NowLine';

const TIME_AXIS_WIDTH = 52;
const HEADER_HEIGHT = 56;

interface Props {
  date: string;
  isToday: boolean;
  events: EventItem[];
  theme: Theme;
  onPressEvent: (event: EventItem) => void;
  onPressEmpty: (date: string, hour: number) => void;
  nowFractionalHour: number;
  viewStartHour?: number;
  viewEndHour?: number;
}

export function DayTimeGrid({
  date,
  isToday,
  events,
  theme,
  onPressEvent,
  onPressEmpty,
  nowFractionalHour,
  viewStartHour = START_HOUR,
  viewEndHour = END_HOUR,
}: Props) {
  const startH = Math.max(START_HOUR, Math.min(viewStartHour, END_HOUR - 1));
  const endH = Math.max(startH + 1, Math.min(viewEndHour, END_HOUR));
  const totalHeight = (endH - startH) * HOUR_HEIGHT;
  const hours = useMemo(
    () => Array.from({ length: endH - startH + 1 }, (_, i) => startH + i),
    [startH, endH]
  );
  const slotHours = useMemo(
    () => Array.from({ length: endH - startH }, (_, i) => startH + i),
    [startH, endH]
  );
  const visible = isToday && nowFractionalHour >= startH && nowFractionalHour <= endH;
  const nowTop = (nowFractionalHour - startH) * HOUR_HEIGHT;

  const vScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const targetHour = isToday
      ? Math.max(startH, Math.floor(nowFractionalHour) - 1)
      : Math.max(startH, 8);
    const y = Math.max(0, (targetHour - startH) * HOUR_HEIGHT);
    const t = setTimeout(() => {
      vScrollRef.current?.scrollTo({ y, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [date, isToday, startH, nowFractionalHour]);

  return (
    <View style={styles.outer}>
      <ScrollView
        ref={vScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.body, { height: totalHeight }]}>
          {/* 時刻軸 */}
          <View style={[styles.timeAxis, { width: TIME_AXIS_WIDTH }]}>
            {hours
              .filter((h) => h < endH)
              .map((h) => {
                const isFirst = h === startH;
                return (
                  <View
                    key={h}
                    style={[
                      styles.hourLabel,
                      {
                        top: isFirst
                          ? (h - startH) * HOUR_HEIGHT + 2
                          : (h - startH) * HOUR_HEIGHT - 7,
                      },
                    ]}
                  >
                    <Text style={[styles.hourText, { color: theme.textTertiary }]}>
                      {formatHour(h)}
                    </Text>
                  </View>
                );
              })}
          </View>

          {/* イベントエリア */}
          <View style={[styles.eventArea, { backgroundColor: isToday ? theme.todayBg : 'transparent' }]}>
            {hours.map((h) => (
              <View
                key={`hl-${h}`}
                pointerEvents="none"
                style={[
                  styles.hourLine,
                  {
                    top: (h - startH) * HOUR_HEIGHT,
                    backgroundColor: theme.separator,
                  },
                ]}
              />
            ))}

            {slotHours.map((h) => (
              <Pressable
                key={`s-${h}`}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPressEmpty(date, h);
                }}
                style={({ pressed, hovered }: any) => [
                  styles.slot,
                  {
                    top: (h - startH) * HOUR_HEIGHT,
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

            {events
              .filter((ev) => ev.endH > startH && ev.startH < endH)
              .map((ev) => {
                const c = theme.palette[ev.color];
                const visStart = Math.max(ev.startH, startH);
                const visEnd = Math.min(ev.endH, endH);
                const top = (visStart - startH) * HOUR_HEIGHT + 1;
                const dur = Math.max(0.5, visEnd - visStart);
                const height = Math.max(28, dur * HOUR_HEIGHT - 2);
                return (
                  <Pressable
                    key={ev.id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onPressEvent(ev);
                    }}
                    style={[
                      styles.eventBlock,
                      {
                        top,
                        height,
                        backgroundColor: c.bg,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <View style={[styles.eventBar, { backgroundColor: c.fg }]} />
                    <View style={styles.eventContent}>
                      <Text
                        numberOfLines={1}
                        style={[styles.eventTitle, { color: c.fg }]}
                      >
                        {ev.pinned ? '🚩 ' : ''}
                        {ev.repeat ? '🔁 ' : ''}
                        {ev.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.eventTime, { color: c.fg }]}
                      >
                        {String(ev.startH).padStart(2, '0')}:00 — {String(ev.endH).padStart(2, '0')}:00
                        {ev.location ? ` ・ ${ev.location}` : ''}
                      </Text>
                      {ev.memo && height > 56 ? (
                        <Text
                          numberOfLines={2}
                          style={[styles.eventMemo, { color: c.fg }]}
                        >
                          {ev.memo}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}

            {visible ? <NowLine topPx={nowTop} theme={theme} /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  body: {
    flexDirection: 'row',
  },
  timeAxis: {
    position: 'relative',
  },
  hourLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  hourText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  eventArea: {
    flex: 1,
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  eventBlock: {
    position: 'absolute',
    left: 6,
    right: 8,
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  eventBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventTime: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
  eventMemo: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.75,
    marginTop: 2,
  },
});
