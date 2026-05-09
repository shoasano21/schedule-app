import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { fromISODate, toISODate } from '../utils/date';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  event: EventItem | null;
  theme: Theme;
  readOnly?: boolean;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
  onDuplicate?: (event: EventItem, newDate: string) => void;
  onStartFocus?: (event: EventItem) => void;
}

export function DetailSheet({
  visible,
  event,
  theme,
  readOnly,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onStartFocus,
}: Props) {
  const [showCopy, setShowCopy] = useState(false);

  React.useEffect(() => {
    if (!visible) setShowCopy(false);
  }, [visible]);

  const dateOptions = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 60 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        iso: toISODate(d),
        label:
          i === 0
            ? '今日'
            : i === 1
            ? '明日'
            : `${d.getMonth() + 1}/${d.getDate()}`,
        dow: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()],
      };
    });
  }, []);
  const handleDelete = (ev: EventItem) => {
    const isRecurring = !!ev.repeat || !!ev.baseId;
    if (!isRecurring) {
      onDelete(ev);
      return;
    }
    const msg = 'この予定は繰り返しイベントです。シリーズ全体を削除しますか？';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(msg);
      if (ok) onDelete(ev);
      return;
    }
    Alert.alert('繰り返しイベントの削除', msg, [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'シリーズを削除', style: 'destructive', onPress: () => onDelete(ev) },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.7}>
      {event ? (
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.colorChip,
                { backgroundColor: theme.palette[event.color].fg },
              ]}
            />
            <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>
              {event.title}
            </Text>
          </View>

          <Row
            theme={theme}
            icon="calendar-outline"
            label={formatDateJa(event.date)}
          />
          <Row
            theme={theme}
            icon="time-outline"
            label={`${pad2(event.startH)}:00 — ${pad2(event.endH)}:00 (${event.endH - event.startH}時間)`}
          />
          {event.repeat ? (
            <Row
              theme={theme}
              icon="repeat-outline"
              label={`${repeatLabel(event.repeat.freq)}${
                event.repeat.until ? ` (${event.repeat.until} まで)` : ''
              }`}
            />
          ) : null}
          {event.pinned ? (
            <Row theme={theme} icon="flag" label="重要日 (カウントダウン中)" />
          ) : null}
          {event.location ? (
            <Row theme={theme} icon="location-outline" label={event.location} />
          ) : null}
          {event.memo ? (
            <View style={styles.memoBox}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.textTertiary}
                style={{ marginTop: 2, marginRight: 10 }}
              />
              <Text style={[styles.memoText, { color: theme.textSecondary }]}>
                {event.memo}
              </Text>
            </View>
          ) : null}

          {readOnly ? (
            <View style={[styles.readOnlyBar, { backgroundColor: theme.bgSecondary }]}>
              <Ionicons name="eye-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.readOnlyText, { color: theme.textTertiary }]}>
                共有された予定 (閲覧のみ)
              </Text>
            </View>
          ) : (
            <>
              {onStartFocus ? (
                <Pressable
                  onPress={() => onStartFocus(event)}
                  style={({ pressed }) => [
                    styles.focusBtn,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="flame" size={18} color="#fff" />
                  <Text style={styles.focusBtnText}>この予定で集中する</Text>
                </Pressable>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onEdit(event)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: theme.accentBg, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={theme.accent} />
                  <Text style={[styles.actionLabel, { color: theme.accent }]}>編集</Text>
                </Pressable>
                {onDuplicate ? (
                  <Pressable
                    onPress={() => setShowCopy((v) => !v)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: showCopy ? theme.accent : theme.bgSecondary,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={showCopy ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.actionLabel,
                        { color: showCopy ? '#fff' : theme.text },
                      ]}
                    >
                      コピー
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => handleDelete(event)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: theme.palette.red.bg, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.palette.red.fg} />
                  <Text style={[styles.actionLabel, { color: theme.palette.red.fg }]}>
                    削除
                  </Text>
                </Pressable>
              </View>

              {showCopy && onDuplicate ? (
                <View style={styles.copyArea}>
                  <Text style={[styles.copyLabel, { color: theme.textTertiary }]}>
                    別の日にコピー
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.copyDateRow}
                  >
                    {dateOptions
                      .filter((d) => d.iso !== event.date)
                      .map((d) => (
                        <Pressable
                          key={d.iso}
                          onPress={() => {
                            onDuplicate(event, d.iso);
                            setShowCopy(false);
                          }}
                          style={[
                            styles.copyChip,
                            {
                              backgroundColor: theme.bgSecondary,
                              borderColor: theme.separator,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.copyChipDow, { color: theme.textTertiary }]}
                          >
                            {d.dow}
                          </Text>
                          <Text style={[styles.copyChipDate, { color: theme.text }]}>
                            {d.label}
                          </Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Row({ theme, icon, label }: { theme: Theme; icon: any; label: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={theme.textTertiary} style={{ marginRight: 10 }} />
      <Text style={[styles.rowText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function repeatLabel(freq: 'daily' | 'weekly' | 'monthly'): string {
  if (freq === 'daily') return '🔁 毎日';
  if (freq === 'weekly') return '🔁 毎週';
  return '🔁 毎月';
}

function formatDateJa(iso: string) {
  const d = fromISODate(iso);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日（${wd}）`;
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorChip: {
    width: 6,
    height: 28,
    borderRadius: 3,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
  },
  memoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
  },
  memoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  focusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  focusBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  copyArea: {
    marginTop: 14,
  },
  copyLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  copyDateRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
  },
  copyChip: {
    minWidth: 56,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  copyChipDow: {
    fontSize: 10,
    fontWeight: '700',
  },
  copyChipDate: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
