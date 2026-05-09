import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Theme } from '../constants/colors';
import type { MonthDay } from '../hooks/useMonth';
import type { EventItem } from '../types/Event';
import { END_HOUR, HOUR_HEIGHT, START_HOUR, formatHour } from '../utils/date';
import { NowLine } from './NowLine';

const TIME_AXIS_WIDTH = 44;
const COL_WIDTH = 56;
const HEADER_HEIGHT = 56;
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  daysOfMonth: MonthDay[];
  eventsByDate: Map<string, EventItem[]>;
  theme: Theme;
  onPressDay: (iso: string) => void;
  onPressEvent: (event: EventItem) => void;
  onPressEmpty: (date: string, hour: number) => void;
  nowLineTop: number;
  nowLineVisible: boolean;
  nowFractionalHour: number;
  monthKey: string;
  todayTick?: number;
  bottomPadding?: number;
}

export function MonthTimeGrid({
  daysOfMonth,
  eventsByDate,
  theme,
  onPressDay,
  onPressEvent,
  onPressEmpty,
  nowLineTop,
  nowLineVisible,
  nowFractionalHour,
  monthKey,
  todayTick = 0,
  bottomPadding = 0,
}: Props) {
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const totalWidth = COL_WIDTH * daysOfMonth.length;
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    []
  );
  const slotHours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );

  const scrollX = useSharedValue(0);
  const hScrollRef = useAnimatedRef<Animated.ScrollView>();
  const vScrollRef = useRef<ScrollView>(null);

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const headerTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -scrollX.value }],
  }));

  // 横方向: 月切替時 / 「今日」ボタン押下時に今日の列を左端へ
  useEffect(() => {
    const todayIdx = daysOfMonth.findIndex((d) => d.isToday);
    if (todayIdx < 0) {
      hScrollRef.current?.scrollTo({ x: 0, animated: false });
      scrollX.value = 0;
      return;
    }
    const x = Math.max(0, todayIdx * COL_WIDTH);
    const t = setTimeout(() => {
      hScrollRef.current?.scrollTo({ x, animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [monthKey, todayTick, daysOfMonth, hScrollRef, scrollX]);

  // 縦方向: 起動・月切替・「今日」押下時に現在時刻 -1h へスクロール
  useEffect(() => {
    const targetHour = Math.max(START_HOUR, Math.floor(nowFractionalHour) - 1);
    const y = (targetHour - START_HOUR) * HOUR_HEIGHT;
    const t = setTimeout(() => {
      vScrollRef.current?.scrollTo({ y, animated: true });
    }, 200);
    return () => clearTimeout(t);
  }, [monthKey, todayTick, nowFractionalHour]);

  return (
    <View style={styles.outer}>
      {/* Sticky day header (vertical scroll の外) */}
      <View
        style={[
          styles.stickyHeaderRow,
          {
            backgroundColor: theme.bg,
            borderBottomColor: theme.separator,
            height: HEADER_HEIGHT,
          },
        ]}
      >
        <View style={{ width: TIME_AXIS_WIDTH }} />
        <View style={styles.headerClip}>
          <Animated.View
            style={[
              { flexDirection: 'row', width: totalWidth },
              headerTranslateStyle,
            ]}
          >
            {daysOfMonth.map((d, idx) => {
              const isWeekend = d.dow === 0 || d.dow === 6;
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                    onPressDay(d.iso);
                  }}
                  style={[
                    styles.headerCell,
                    {
                      width: COL_WIDTH,
                      backgroundColor: d.isToday ? theme.accentBg : 'transparent',
                      borderLeftColor: theme.separator,
                      borderLeftWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.headerDow,
                      {
                        color: d.isToday
                          ? theme.accent
                          : d.dow === 0
                          ? theme.palette.red.fg
                          : d.dow === 6
                          ? theme.palette.blue.fg
                          : theme.textTertiary,
                      },
                    ]}
                  >
                    {WEEKDAY_LABELS[d.dow]}
                  </Text>
                  <View
                    style={[
                      styles.headerDayWrap,
                      d.isToday && { backgroundColor: theme.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headerDay,
                        {
                          color: d.isToday
                            ? '#fff'
                            : isWeekend
                            ? theme.palette.red.fg
                            : theme.text,
                        },
                      ]}
                    >
                      {d.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </View>

      {/* 縦スクロール本体 */}
      <ScrollView
        ref={vScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.body, { height: totalHeight }]}>
          {/* 時刻軸 */}
          <View style={[styles.timeAxis, { width: TIME_AXIS_WIDTH }]}>
            <View style={{ height: totalHeight, position: 'relative' }}>
              {hours
                .filter((h) => h < END_HOUR)
                .map((h) => {
                  const isFirst = h === START_HOUR;
                  return (
                    <View
                      key={h}
                      style={[
                        styles.hourLabel,
                        {
                          top: isFirst
                            ? (h - START_HOUR) * HOUR_HEIGHT + 2
                            : (h - START_HOUR) * HOUR_HEIGHT - 7,
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
          </View>

          {/* 横スクロール: 日付グリッド */}
          <Animated.ScrollView
            ref={hScrollRef}
            horizontal
            onScroll={handler}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ width: totalWidth }}
          >
            <View style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
              {hours.map((h) => (
                <View
                  key={`hl-${h}`}
                  pointerEvents="none"
                  style={[
                    styles.hourLine,
                    {
                      top: (h - START_HOUR) * HOUR_HEIGHT,
                      backgroundColor: theme.separator,
                    },
                  ]}
                />
              ))}

              <View style={styles.dayColumns}>
                {daysOfMonth.map((d, idx) => {
                  const list = eventsByDate.get(d.iso) ?? [];
                  return (
                    <View
                      key={d.iso}
                      style={[
                        styles.dayCol,
                        {
                          width: COL_WIDTH,
                          backgroundColor: d.isToday ? theme.todayBg : 'transparent',
                          borderLeftColor: theme.separator,
                          borderLeftWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      {slotHours.map((h) => (
                        <Pressable
                          key={`s-${h}`}
                          onPress={() => {
                            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onPressEmpty(d.iso, h);
                          }}
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
                      {list.map((ev) => {
                        const c = theme.palette[ev.color];
                        const top = (ev.startH - START_HOUR) * HOUR_HEIGHT + 1;
                        const dur = Math.max(0.5, ev.endH - ev.startH);
                        const height = Math.max(18, dur * HOUR_HEIGHT - 2);
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
                                numberOfLines={2}
                                style={[styles.eventTitle, { color: c.fg }]}
                              >
                                {ev.title}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                      {d.isToday && nowLineVisible ? (
                        <NowLine topPx={nowLineTop} theme={theme} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  stickyHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 5,
  },
  headerClip: {
    flex: 1,
    overflow: 'hidden',
  },
  headerCell: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  headerDow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerDayWrap: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDay: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  body: {
    flexDirection: 'row',
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
    fontSize: 10.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  dayColumns: {
    flexDirection: 'row',
    height: '100%',
  },
  dayCol: {
    position: 'relative',
    height: '100%',
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  eventBlock: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  eventBar: {
    width: 2,
  },
  eventContent: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  eventTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
