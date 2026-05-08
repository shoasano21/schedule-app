import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { Theme } from '../constants/colors';
import { STATUS_COLORS, STATUS_LABELS_JA, TASK_TYPES } from '../constants/taskTypes';
import type { Task } from '../types/Task';
import { fromISODate, toISODate } from '../utils/date';
import { daysBetween, daysLeft, sortedByDeadline, statusBadge, statusOf, todayISO } from '../utils/task';

interface Props {
  tasks: Task[];
  theme: Theme;
  onPressTask: (task: Task) => void;
  onToggleDone: (id: string) => void;
}

const PX_PER_DAY = 36;
const TITLE_COL_WIDTH = 132;
const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 40;

export function GanttView({ tasks, theme, onPressTask }: Props) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const sorted = useMemo(() => sortedByDeadline(tasks), [tasks]);
  const hScrollRef = useRef<ScrollView>(null);

  const layout = useMemo(() => {
    const today = fromISODate(todayISO());
    let minD = today;
    let maxD = today;
    for (const t of sorted) {
      const s = fromISODate(t.start);
      const e = fromISODate(t.end);
      if (s < minD) minD = s;
      if (e > maxD) maxD = e;
    }
    minD = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate() - 2);
    maxD = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate() + 2);
    const total = Math.max(7, daysBetween(minD, maxD));
    const dayList: { dateISO: string; left: number; isToday: boolean; dow: number }[] = [];
    for (let i = 0; i <= total; i++) {
      const d = new Date(minD);
      d.setDate(minD.getDate() + i);
      dayList.push({
        dateISO: toISODate(d),
        left: i * PX_PER_DAY,
        isToday: toISODate(d) === todayISO(),
        dow: d.getDay(),
      });
    }
    const monthList: { label: string; left: number }[] = [];
    let cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const endCursor = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 1);
    while (cursor < endCursor) {
      const offset = Math.max(0, daysBetween(minD, cursor));
      monthList.push({
        label: `${cursor.getFullYear()}/${cursor.getMonth() + 1}`,
        left: offset * PX_PER_DAY,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return { minDate: minD, maxDate: maxD, totalDays: total, days: dayList, months: monthList };
  }, [sorted]);

  // Auto-scroll horizontal so today is near the left of the timeline
  useEffect(() => {
    if (sorted.length === 0) return;
    const todayLeft = daysBetween(layout.minDate, fromISODate(todayISO())) * PX_PER_DAY;
    const t = setTimeout(() => {
      hScrollRef.current?.scrollTo({ x: Math.max(0, todayLeft - 40), animated: true });
    }, 200);
    return () => clearTimeout(t);
  }, [sorted.length, layout.minDate]);

  if (sorted.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-done-outline" size={36} color={theme.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>課題はまだありません</Text>
        <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
          右下の追加ボタンから課題を登録できます
        </Text>
      </View>
    );
  }

  const { minDate, totalDays, days, months } = layout;
  const todayLeft = daysBetween(minDate, fromISODate(todayISO())) * PX_PER_DAY;
  const totalWidth = (totalDays + 1) * PX_PER_DAY;
  const totalRowsHeight = sorted.length * ROW_HEIGHT;

  return (
    <View style={[styles.wrap, { borderColor: theme.separator, backgroundColor: theme.bgElevated }]}>
      <View style={styles.row}>
        {/* Fixed title column */}
        <View
          style={{
            width: TITLE_COL_WIDTH,
            borderRightColor: theme.separator,
            borderRightWidth: 1,
          }}
        >
          <View
            style={[
              styles.titleHeader,
              {
                height: HEADER_HEIGHT,
                borderBottomColor: theme.separator,
                backgroundColor: theme.bgSecondary,
              },
            ]}
          >
            <Text style={[styles.titleHeaderText, { color: theme.textTertiary }]}>課題</Text>
          </View>
          {sorted.map((task) => {
            const status = statusOf(task);
            const left_ = daysLeft(task);
            const sCol = STATUS_COLORS[status];
            const meta = TASK_TYPES[task.type];
            return (
              <Pressable
                key={task.id}
                onPress={() => onPressTask(task)}
                style={[
                  styles.titleCell,
                  {
                    height: ROW_HEIGHT,
                    borderBottomColor: theme.separator,
                    backgroundColor: theme.bgElevated,
                  },
                ]}
              >
                <Text style={[styles.courseTag, { color: meta.fg }]} numberOfLines={1}>
                  {meta.emoji} {task.course}
                </Text>
                <Text
                  style={[
                    styles.titleMain,
                    {
                      color: task.done ? theme.textTertiary : theme.text,
                      textDecorationLine: task.done ? 'line-through' : 'none',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <View style={styles.titleBottomLine}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: dark ? sCol.bgDark : sCol.bgLight },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: sCol.fg }]}>
                      {task.done ? STATUS_LABELS_JA.done : statusBadge(status, left_)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Scrollable timeline */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={hScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: totalWidth }}
          >
            <View style={{ width: totalWidth }}>
              {/* Date header */}
              <View
                style={[
                  styles.dateHeader,
                  {
                    height: HEADER_HEIGHT,
                    width: totalWidth,
                    borderBottomColor: theme.separator,
                    backgroundColor: theme.bgSecondary,
                  },
                ]}
              >
                {months.map((m) => (
                  <Text
                    key={m.left}
                    style={[
                      styles.monthLabel,
                      { color: theme.textTertiary, left: m.left + 4 },
                    ]}
                  >
                    {m.label}
                  </Text>
                ))}
                <View style={styles.dayLabelsRow}>
                  {days.map((d) => (
                    <View
                      key={d.dateISO}
                      style={[
                        styles.dayLabelCell,
                        {
                          width: PX_PER_DAY,
                          borderRightColor: theme.separator,
                          backgroundColor: d.isToday ? theme.accentBg : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabelText,
                          {
                            color: d.isToday
                              ? theme.accent
                              : d.dow === 0
                              ? theme.palette.red.fg
                              : d.dow === 6
                              ? theme.palette.blue.fg
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {fromISODate(d.dateISO).getDate()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Timeline body */}
              <View
                style={{
                  width: totalWidth,
                  height: totalRowsHeight,
                  position: 'relative',
                }}
              >
                {/* Day vertical separators (background) */}
                {days.map((d, i) => (
                  <View
                    key={`bg-${d.dateISO}`}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: i * PX_PER_DAY,
                      width: PX_PER_DAY,
                      borderRightWidth: StyleSheet.hairlineWidth,
                      borderRightColor: theme.separator,
                      backgroundColor: d.isToday ? theme.accentBg : 'transparent',
                    }}
                  />
                ))}
                {/* Task rows + bars */}
                {sorted.map((task, idx) => {
                  const left = daysBetween(minDate, fromISODate(task.start)) * PX_PER_DAY;
                  const width = Math.max(
                    PX_PER_DAY * 0.8,
                    (daysBetween(fromISODate(task.start), fromISODate(task.end)) + 1) * PX_PER_DAY - 4
                  );
                  const status = statusOf(task);
                  const sCol = STATUS_COLORS[status];
                  const barBg = task.done ? STATUS_COLORS.done.fg : sCol.fg;
                  return (
                    <View
                      key={task.id}
                      style={{
                        position: 'absolute',
                        top: idx * ROW_HEIGHT,
                        left: 0,
                        width: totalWidth,
                        height: ROW_HEIGHT,
                        borderBottomColor: theme.separator,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      }}
                    >
                      <Pressable
                        onPress={() => onPressTask(task)}
                        style={({ pressed }) => [
                          styles.bar,
                          {
                            left,
                            width,
                            backgroundColor: barBg,
                            opacity: task.done ? 0.45 : pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text style={styles.barText} numberOfLines={1}>
                          {fromISODate(task.start).getMonth() + 1}/{fromISODate(task.start).getDate()} → {fromISODate(task.end).getMonth() + 1}/{fromISODate(task.end).getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
                {/* Today vertical line */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: todayLeft,
                    width: 2,
                    height: totalRowsHeight,
                    backgroundColor: theme.nowLine,
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  empty: {
    alignItems: 'center',
    padding: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  titleHeader: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  titleCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  courseTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleMain: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  titleBottomLine: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dateHeader: {
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthLabel: {
    position: 'absolute',
    top: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 20,
  },
  dayLabelCell: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  dayLabelText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bar: {
    position: 'absolute',
    top: 18,
    height: ROW_HEIGHT - 28,
    borderRadius: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  barText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
});
