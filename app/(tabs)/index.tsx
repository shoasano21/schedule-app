import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddEventSheet, type AddEventInput } from '../../components/AddEventSheet';
import { DetailSheet } from '../../components/DetailSheet';
import { EventSearchSheet } from '../../components/EventSearchSheet';
import { MonthHeader } from '../../components/MonthHeader';
import { MonthTimeGrid } from '../../components/MonthTimeGrid';
import { ScheduleShareSheet } from '../../components/ScheduleShareSheet';
import { usePreferences } from '../../hooks/PreferencesContext';
import { useEvents } from '../../hooks/useEvents';
import { useMonth } from '../../hooks/useMonth';
import { useNowLine } from '../../hooks/useNowLine';
import { useSharedSchedules } from '../../hooks/useSharedSchedules';
import { useTheme } from '../../hooks/useTheme';
import type { EventItem } from '../../types/Event';

export default function ScheduleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const month = useMonth();
  const events = useEvents();
  const { gridStartHour, gridEndHour } = usePreferences();
  const now = useNowLine(gridStartHour, gridEndHour);
  const shared = useSharedSchedules();

  const [selected, setSelected] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [defaultStartH, setDefaultStartH] = useState<number | undefined>(undefined);
  const [todayTick, setTodayTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);

  // 取り込んだスケジュールが削除されたら自分に戻す
  useEffect(() => {
    if (activeSharedId && !shared.schedules.some((s) => s.id === activeSharedId)) {
      setActiveSharedId(null);
    }
  }, [activeSharedId, shared.schedules]);

  const activeShared = activeSharedId
    ? shared.schedules.find((s) => s.id === activeSharedId) ?? null
    : null;
  const isShared = !!activeShared;

  // 重要日 (pinned) の中から今日以降で最も近いものを 1 件 → カウントダウン用
  const nextCountdown = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const list = (activeSharedId ? activeShared?.events ?? [] : events.events) as typeof events.events;
    const upcoming = list
      .filter((e) => e.pinned && e.date >= todayISO)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) return null;
    const ev = upcoming[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(ev.date + 'T00:00:00');
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    return { title: ev.title, days };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.events, activeSharedId]);

  // 表示するイベント: 自分 or 共有された人のスナップショット
  const displayEventsByDate = useMemo(() => {
    if (!activeShared) return events.eventsByDate;
    const map = new Map<string, EventItem[]>();
    for (const e of activeShared.events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startH - b.startH);
    }
    return map;
  }, [activeShared, events.eventsByDate]);

  const handleToday = useCallback(() => {
    month.goToday();
    setTodayTick((t) => t + 1);
  }, [month]);

  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      handleToday();
    });
    return unsubscribe;
  }, [navigation, handleToday]);

  const handlePressDay = useCallback(
    (iso: string) => {
      if (isShared) return; // 共有表示中は編集不可
      setEditing(null);
      setDefaultDate(iso);
      setDefaultStartH(undefined);
      setEditorOpen(true);
    },
    [isShared]
  );

  const handlePressEmpty = useCallback(
    (date: string, hour: number) => {
      if (isShared) return; // 共有表示中は編集不可
      setEditing(null);
      setDefaultDate(date);
      setDefaultStartH(hour);
      setEditorOpen(true);
    },
    [isShared]
  );

  const handlePressEvent = useCallback((ev: EventItem) => {
    setSelected(ev);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(
    (ev: EventItem) => {
      if (isShared) return;
      setDetailOpen(false);
      setTimeout(() => {
        setEditing(ev);
        setDefaultDate(undefined);
        setDefaultStartH(undefined);
        setEditorOpen(true);
      }, 200);
    },
    [isShared]
  );

  const handleDeleteFromDetail = useCallback(
    (ev: EventItem) => {
      if (isShared) return;
      events.removeEvent(ev.id);
      setDetailOpen(false);
    },
    [events, isShared]
  );

  const handleSubmit = useCallback(
    (input: AddEventInput) => {
      const baseData = {
        title: input.title,
        startH: input.startH,
        endH: input.endH,
        color: input.color,
        location: input.location,
        memo: input.memo,
        pinned: input.pinned,
        repeat: input.repeat,
      };
      if (input.id) {
        // 仮想インスタンス or 繰り返しテンプレートの場合は date を変更しない
        const realId = input.id.includes('::') ? input.id.split('::')[0] : input.id;
        const original = events.events.find((e) => e.id === realId);
        const skipDate = input.id.includes('::') || !!original?.repeat;
        events.updateEvent(input.id, skipDate ? baseData : { ...baseData, date: input.date });
      } else {
        events.addEvent({ ...baseData, date: input.date });
      }
      setEditorOpen(false);
      setEditing(null);
    },
    [events]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <MonthHeader
        label={month.label}
        theme={theme}
        onPrev={month.goPrev}
        onNext={month.goNext}
        onSearch={() => setSearchOpen(true)}
        onShare={() => setShareOpen(true)}
        viewingName={activeShared?.name ?? null}
        countdown={nextCountdown}
      />
      <MonthTimeGrid
        daysOfMonth={month.daysOfMonth}
        eventsByDate={displayEventsByDate}
        theme={theme}
        onPressDay={handlePressDay}
        onPressEvent={handlePressEvent}
        onPressEmpty={handlePressEmpty}
        nowLineTop={now.topPx}
        nowLineVisible={now.visible}
        nowFractionalHour={now.hourFloat}
        monthKey={month.label}
        todayTick={todayTick}
        viewStartHour={gridStartHour}
        viewEndHour={gridEndHour}
      />

      <DetailSheet
        visible={detailOpen}
        event={selected}
        theme={theme}
        readOnly={isShared}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />
      <AddEventSheet
        visible={editorOpen}
        theme={theme}
        initial={editing}
        defaultDate={defaultDate}
        defaultStartH={defaultStartH}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
          setDefaultDate(undefined);
          setDefaultStartH(undefined);
        }}
        onSubmit={handleSubmit}
      />

      <EventSearchSheet
        visible={searchOpen}
        theme={theme}
        events={isShared && activeShared ? activeShared.events : events.events}
        onClose={() => setSearchOpen(false)}
      />

      <ScheduleShareSheet
        visible={shareOpen}
        theme={theme}
        activeId={activeSharedId}
        onClose={() => setShareOpen(false)}
        onSelectSelf={() => {
          setActiveSharedId(null);
          setShareOpen(false);
        }}
        onSelectShared={(id) => {
          setActiveSharedId(id);
          setShareOpen(false);
        }}
        schedules={shared.schedules}
        shareName={shared.shareName}
        busy={shared.busy}
        error={shared.error}
        info={shared.info}
        myEvents={events.events}
        prepareQRPayload={shared.prepareQRPayload}
        ingestQRPayload={shared.ingestQRPayload}
        onRemove={shared.removeSchedule}
        onClearMessages={shared.clearMessages}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
