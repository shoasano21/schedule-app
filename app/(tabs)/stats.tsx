import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PomodoroSheet } from '../../components/PomodoroSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStudySessions } from '../../hooks/useStudySessions';
import { useTheme } from '../../hooks/useTheme';

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sessions, stats, addSession } = useStudySessions();
  const [pomodoroOpen, setPomodoroOpen] = useState(false);

  const maxWeek = Math.max(1, ...stats.weekDays.map((d) => d.sec));

  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScreenHeader title="学習" theme={theme} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick start */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            setPomodoroOpen(true);
          }}
          style={({ pressed }) => [
            styles.quickStart,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="play-circle" size={28} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.quickStartTitle}>集中タイマーを開始</Text>
            <Text style={styles.quickStartSub}>Pomodoro で集中時間を計測 + 記録</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Stats overview */}
        <View style={styles.metricRow}>
          <Metric
            theme={theme}
            label="今日"
            value={fmtMin(stats.todaySec)}
            sub="分"
            big
          />
          <Metric
            theme={theme}
            label="今週"
            value={fmtMin(stats.weekSec)}
            sub="分"
          />
          <Metric
            theme={theme}
            label="今月"
            value={fmtMin(stats.monthSec)}
            sub="分"
          />
        </View>

        <View
          style={[
            styles.streakCard,
            {
              backgroundColor: stats.streak > 0 ? theme.palette.orange.bg : theme.bgSecondary,
              borderColor: stats.streak > 0 ? theme.palette.orange.fg : theme.separator,
            },
          ]}
        >
          <Ionicons
            name={stats.streak > 0 ? 'flame' : 'flame-outline'}
            size={28}
            color={stats.streak > 0 ? theme.palette.orange.fg : theme.textTertiary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.streakLabel, { color: theme.textTertiary }]}>
              継続記録
            </Text>
            <Text
              style={[
                styles.streakValue,
                { color: stats.streak > 0 ? theme.palette.orange.fg : theme.text },
              ]}
            >
              {stats.streak} 日連続
            </Text>
          </View>
          <Text style={[styles.streakHint, { color: theme.textTertiary }]}>
            5分以上の集中{'\n'}で1日カウント
          </Text>
        </View>

        {/* Weekly chart */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
          直近7日間
        </Text>
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
          ]}
        >
          {stats.weekDays.map((day, i) => {
            const ratio = maxWeek > 0 ? day.sec / maxWeek : 0;
            const d = new Date(day.iso + 'T00:00:00');
            const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
            const todayISO = new Date().toISOString().slice(0, 10);
            const isToday = day.iso === todayISO;
            return (
              <View key={day.iso} style={styles.chartCol}>
                <View style={styles.chartBarWrap}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(2, ratio * 100)}%`,
                        backgroundColor: isToday ? theme.accent : theme.accent,
                        opacity: day.sec > 0 ? 1 : 0.15,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.chartLabel,
                    {
                      color: isToday ? theme.accent : theme.textTertiary,
                      fontWeight: isToday ? '800' : '600',
                    },
                  ]}
                >
                  {dow}
                </Text>
                <Text style={[styles.chartValue, { color: theme.text }]}>
                  {Math.round(day.sec / 60)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Top titles */}
        {stats.topTitles.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              よく学習しているタイトル
            </Text>
            <View
              style={[
                styles.listCard,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              {stats.topTitles.map(([title, sec], i) => {
                const max = stats.topTitles[0][1];
                const ratio = max > 0 ? sec / max : 0;
                return (
                  <View
                    key={title}
                    style={[
                      styles.titleRow,
                      i > 0 && {
                        borderTopColor: theme.separator,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.titleRank, { color: theme.textTertiary }]}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.titleName, { color: theme.text }]} numberOfLines={1}>
                        {title}
                      </Text>
                      <View style={[styles.titleBarBg, { backgroundColor: theme.separator }]}>
                        <View
                          style={[
                            styles.titleBarFill,
                            { width: `${ratio * 100}%`, backgroundColor: theme.accent },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.titleTime, { color: theme.text }]}>
                      {fmtHourMin(sec)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Recent sessions */}
        {sessions.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              最近のセッション ({sessions.length})
            </Text>
            <View
              style={[
                styles.listCard,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              {sessions.slice(0, 8).map((s, i) => (
                <View
                  key={s.id}
                  style={[
                    styles.sessionRow,
                    i > 0 && {
                      borderTopColor: theme.separator,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Ionicons
                    name={s.completed ? 'checkmark-circle' : 'pause-circle-outline'}
                    size={18}
                    color={s.completed ? theme.palette.green.fg : theme.textTertiary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>
                      {s.eventTitle?.trim() || '集中セッション'}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: theme.textTertiary }]}>
                      {fmtDateTime(s.startedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDur, { color: theme.text }]}>
                    {fmtHourMin(s.durationSec)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              まだ記録がありません
            </Text>
            <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
              上の「集中タイマーを開始」から計測を開始すると履歴が貯まります
            </Text>
          </View>
        )}
      </ScrollView>

      <PomodoroSheet
        visible={pomodoroOpen}
        theme={theme}
        onClose={() => setPomodoroOpen(false)}
        onLog={addSession}
      />
    </View>
  );
}

function Metric({
  theme,
  label,
  value,
  sub,
  big,
}: {
  theme: any;
  label: string;
  value: string;
  sub: string;
  big?: boolean;
}) {
  return (
    <View
      style={[
        styles.metric,
        big && { flex: 1.4 },
        { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text
          style={[
            styles.metricValue,
            { color: theme.text, fontSize: big ? 32 : 22 },
          ]}
        >
          {value}
        </Text>
        <Text style={[styles.metricSub, { color: theme.textTertiary }]}>{sub}</Text>
      </View>
    </View>
  );
}

function fmtMin(sec: number): string {
  return String(Math.round(sec / 60));
}

function fmtHourMin(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}時間` : `${h}時間${r}分`;
}

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return `今日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickStart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginVertical: 12,
  },
  quickStartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  quickStartSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  metricValue: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '700',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  streakValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  streakHint: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 13,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chartCard: {
    flexDirection: 'row',
    height: 160,
    padding: 12,
    paddingBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarWrap: {
    flex: 1,
    width: 18,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  listCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  titleRank: {
    fontSize: 13,
    fontWeight: '800',
    width: 16,
    textAlign: 'center',
  },
  titleName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  titleBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  titleTime: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'right',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  sessionDur: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
});
