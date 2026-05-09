import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { fromISODate } from '../utils/date';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  event: EventItem | null;
  theme: Theme;
  readOnly?: boolean;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
}

export function DetailSheet({ visible, event, theme, readOnly, onClose, onEdit, onDelete }: Props) {
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
            <View style={styles.actions}>
              <Pressable
                onPress={() => onEdit(event)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.accentBg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="create-outline" size={18} color={theme.accent} />
                <Text style={[styles.actionLabel, { color: theme.accent }]}>編集</Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(event)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: theme.palette.red.bg,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={theme.palette.red.fg} />
                <Text style={[styles.actionLabel, { color: theme.palette.red.fg }]}>
                  削除
                </Text>
              </Pressable>
            </View>
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
});
