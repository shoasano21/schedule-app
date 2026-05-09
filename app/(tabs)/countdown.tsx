import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddEventSheet, type AddEventInput } from '../../components/AddEventSheet';
import { DetailSheet } from '../../components/DetailSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useEvents } from '../../hooks/useEvents';
import { useTheme } from '../../hooks/useTheme';
import type { EventItem } from '../../types/Event';
import { fromISODate, toISODate } from '../../utils/date';

interface CountdownItem {
  ev: EventItem;
  days: number;
  isToday: boolean;
  isPast: boolean;
}

export default function CountdownScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const events = useEvents();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [showPast, setShowPast] = useState(false);

  const todayISO = useMemo(() => toISODate(new Date()), []);

  const items: CountdownItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.events
      .filter((e) => e.pinned)
      .map((ev) => {
        const target = fromISODate(ev.date);
        target.setHours(0, 0, 0, 0);
        const days = Math.round((target.getTime() - today.getTime()) / 86400000);
        return {
          ev,
          days,
          isToday: ev.date === todayISO,
          isPast: days < 0,
        };
      })
      .sort((a, b) => a.days - b.days);
  }, [events.events, todayISO]);

  const upcoming = items.filter((i) => !i.isPast);
  const past = items.filter((i) => i.isPast);
  const visibleItems = showPast ? items : upcoming;

  const handleAdd = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(null);
    setEditorOpen(true);
  };

  const handlePress = (ev: EventItem) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSelected(ev);
    setDetailOpen(true);
  };

  const handleEdit = (ev: EventItem) => {
    setDetailOpen(false);
    setTimeout(() => {
      setEditing(ev);
      setEditorOpen(true);
    }, 200);
  };

  const handleDelete = (ev: EventItem) => {
    events.removeEvent(ev.id);
    setDetailOpen(false);
  };

  const handleSubmit = (input: AddEventInput) => {
    const baseData = {
      title: input.title,
      startH: input.startH,
      endH: input.endH,
      color: input.color,
      location: input.location,
      memo: input.memo,
      pinned: input.pinned !== false, // カウントダウンタブから追加なのでデフォルト pinned
      repeat: input.repeat,
    };
    if (input.id) {
      events.updateEvent(input.id, baseData);
    } else {
      events.addEvent({ ...baseData, date: input.date });
    }
    setEditorOpen(false);
    setEditing(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScreenHeader
        title="カウントダウン"
        theme={theme}
        onAdd={handleAdd}
        rightExtra={
          past.length > 0 ? (
            <Pressable
              onPress={() => setShowPast((v) => !v)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.toggleBtn,
                {
                  backgroundColor: showPast ? theme.accentBg : theme.bgSecondary,
                  borderColor: showPast ? theme.accent : theme.separator,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={showPast ? 'eye' : 'eye-off-outline'}
                size={16}
                color={showPast ? theme.accent : theme.text}
              />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Ionicons name="flag-outline" size={36} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              カウントダウン中の予定はありません
            </Text>
            <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
              月間スケジュールから予定を追加して「重要日」をオン、または右上の + から直接追加できます
            </Text>
          </View>
        ) : (
          visibleItems.map((it, i) => (
            <CountdownCard
              key={it.ev.id}
              item={it}
              theme={theme}
              isFirst={i === 0 && !it.isPast}
              onPress={() => handlePress(it.ev)}
            />
          ))
        )}

        {!showPast && past.length > 0 ? (
          <Pressable
            onPress={() => setShowPast(true)}
            style={({ pressed }) => [
              styles.showPastBtn,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: theme.separator,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.showPastText, { color: theme.textTertiary }]}>
              過ぎた予定を表示 ({past.length})
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <DetailSheet
        visible={detailOpen}
        event={selected}
        theme={theme}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddEventSheet
        visible={editorOpen}
        theme={theme}
        initial={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

function CountdownCard({
  item,
  theme,
  isFirst,
  onPress,
}: {
  item: CountdownItem;
  theme: any;
  isFirst: boolean;
  onPress: () => void;
}) {
  const { ev, days, isToday, isPast } = item;
  const c = theme.palette[ev.color];
  const dow = ['日', '月', '火', '水', '木', '金', '土'][fromISODate(ev.date).getDay()];

  const numColor = isToday
    ? theme.palette.red.fg
    : isPast
    ? theme.textTertiary
    : isFirst
    ? theme.palette.orange.fg
    : theme.text;

  const labelText = isToday
    ? '今日'
    : isPast
    ? `${Math.abs(days)} 日前`
    : days === 1
    ? '明日'
    : 'あと';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isFirst ? theme.palette.orange.bg : theme.bgSecondary,
          borderColor: isFirst ? theme.palette.orange.fg : theme.separator,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.colorBar, { backgroundColor: c.fg }]} />
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.cardTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {ev.title}
        </Text>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={theme.textTertiary} />
          <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
            {ev.date} ({dow}) {String(ev.startH).padStart(2, '0')}:00
          </Text>
        </View>
      </View>
      <View style={styles.daysWrap}>
        {!isToday && days !== 1 ? (
          <Text style={[styles.daysSmall, { color: numColor }]}>
            {labelText}
          </Text>
        ) : null}
        {isToday || days === 1 ? (
          <Text style={[styles.daysToday, { color: numColor }]}>{labelText}</Text>
        ) : (
          <View style={styles.daysNumRow}>
            <Text style={[styles.daysNum, { color: numColor }]}>
              {Math.abs(days)}
            </Text>
            <Text style={[styles.daysUnit, { color: numColor }]}>
              {isPast ? '' : '日'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  colorBar: {
    width: 4,
    height: 44,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  daysWrap: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  daysNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  daysNum: {
    fontSize: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  daysUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  daysSmall: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: -2,
  },
  daysToday: {
    fontSize: 22,
    fontWeight: '900',
  },
  showPastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  showPastText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
