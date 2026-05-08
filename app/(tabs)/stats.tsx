import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '../../hooks/useEvents';
import { useTheme } from '../../hooks/useTheme';
import { useWeek } from '../../hooks/useWeek';
import type { ColorId } from '../../types/Event';
import { COLOR_IDS } from '../../types/Event';
import { toISODate } from '../../utils/date';

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { events } = useEvents();
  const week = useWeek();

  const weekIsoSet = useMemo(
    () => new Set(week.weekDates.map(toISODate)),
    [week.weekDates]
  );

  const data = useMemo(() => {
    const totals = new Map<ColorId, number>();
    let totalHours = 0;
    for (const e of events) {
      if (!weekIsoSet.has(e.date)) continue;
      const dur = e.endH - e.startH;
      totals.set(e.color, (totals.get(e.color) ?? 0) + dur);
      totalHours += dur;
    }
    const dayHours = week.weekDates.map((d) => {
      const iso = toISODate(d);
      let hours = 0;
      for (const e of events) {
        if (e.date === iso) hours += e.endH - e.startH;
      }
      return hours;
    });
    return { totals, totalHours, dayHours };
  }, [events, weekIsoSet, week.weekDates]);

  const maxDay = Math.max(1, ...data.dayHours);

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>記録</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>{week.label}の統計</Text>
      </View>

      <View
        style={[
          styles.totalCard,
          { backgroundColor: theme.accentBg, borderColor: theme.separator },
        ]}
      >
        <Text style={[styles.totalLabel, { color: theme.accent }]}>合計時間</Text>
        <View style={styles.totalRow}>
          <Text style={[styles.totalNum, { color: theme.text }]}>{data.totalHours}</Text>
          <Text style={[styles.totalUnit, { color: theme.textSecondary }]}>時間</Text>
        </View>
        <Text style={[styles.totalSub, { color: theme.textTertiary }]}>
          1日平均 {(data.totalHours / 7).toFixed(1)} 時間
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>曜日別</Text>
      <View
        style={[
          styles.chartCard,
          { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
        ]}
      >
        {week.weekDates.map((d, idx) => {
          const wd = ['月', '火', '水', '木', '金', '土', '日'][idx];
          const hours = data.dayHours[idx];
          const widthPct = `${(hours / maxDay) * 100}%` as `${number}%`;
          return (
            <View key={idx} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                {wd} {d.getDate()}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: theme.bg }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: widthPct, backgroundColor: theme.accent, opacity: hours ? 1 : 0 },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.barValue,
                  { color: hours ? theme.text : theme.textTertiary },
                ]}
              >
                {hours}h
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>カテゴリ別</Text>
      <View style={styles.colorList}>
        {COLOR_IDS.map((id) => {
          const hours = data.totals.get(id) ?? 0;
          if (hours === 0) return null;
          const c = theme.palette[id];
          const pct = data.totalHours > 0 ? Math.round((hours / data.totalHours) * 100) : 0;
          return (
            <View
              key={id}
              style={[
                styles.colorRow,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: c.fg }]} />
              <Text style={[styles.colorLabel, { color: theme.text }]}>{labelFor(id)}</Text>
              <Text style={[styles.colorHours, { color: theme.textSecondary }]}>
                {hours}h ({pct}%)
              </Text>
            </View>
          );
        })}
        {data.totalHours === 0 ? (
          <View
            style={[
              styles.emptyRow,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              この週の記録はまだありません
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function labelFor(id: ColorId): string {
  const m: Record<ColorId, string> = {
    blue: '青',
    teal: 'ティール',
    green: '緑',
    orange: 'オレンジ',
    red: '赤',
    pink: 'ピンク',
    purple: '紫',
    indigo: 'インディゴ',
    brown: 'ブラウン',
    gray: 'グレー',
  };
  return m[id];
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  totalCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalNum: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  totalUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 10,
    marginTop: 6,
  },
  chartCard: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  barValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  colorList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  colorHours: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyRow: {
    padding: 18,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
