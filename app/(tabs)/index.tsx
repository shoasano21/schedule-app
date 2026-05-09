import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddEventSheet, type AddEventInput } from '../../components/AddEventSheet';
import { DetailSheet } from '../../components/DetailSheet';
import { MonthHeader } from '../../components/MonthHeader';
import { MonthTimeGrid } from '../../components/MonthTimeGrid';
import { useEvents } from '../../hooks/useEvents';
import { useMonth } from '../../hooks/useMonth';
import { useNowLine } from '../../hooks/useNowLine';
import { useTheme } from '../../hooks/useTheme';
import type { EventItem } from '../../types/Event';

export default function ScheduleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const month = useMonth();
  const events = useEvents();
  const now = useNowLine();

  const [selected, setSelected] = useState<EventItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [defaultStartH, setDefaultStartH] = useState<number | undefined>(undefined);
  const [todayTick, setTodayTick] = useState(0);

  const handleToday = useCallback(() => {
    month.goToday();
    setTodayTick((t) => t + 1);
  }, [month]);

  // タブバーで「月間」タブをタップすると今日へスクロール (既に表示中でも)
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      handleToday();
    });
    return unsubscribe;
  }, [navigation, handleToday]);

  const handlePressDay = useCallback((iso: string) => {
    setEditing(null);
    setDefaultDate(iso);
    setDefaultStartH(undefined);
    setEditorOpen(true);
  }, []);

  const handlePressEmpty = useCallback((date: string, hour: number) => {
    setEditing(null);
    setDefaultDate(date);
    setDefaultStartH(hour);
    setEditorOpen(true);
  }, []);

  const handlePressEvent = useCallback((ev: EventItem) => {
    setSelected(ev);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback((ev: EventItem) => {
    setDetailOpen(false);
    setTimeout(() => {
      setEditing(ev);
      setDefaultDate(undefined);
      setDefaultStartH(undefined);
      setEditorOpen(true);
    }, 200);
  }, []);

  const handleDeleteFromDetail = useCallback(
    (ev: EventItem) => {
      events.removeEvent(ev.id);
      setDetailOpen(false);
    },
    [events]
  );

  const handleSubmit = useCallback(
    (input: AddEventInput) => {
      if (input.id) {
        events.updateEvent(input.id, {
          title: input.title,
          date: input.date,
          startH: input.startH,
          endH: input.endH,
          color: input.color,
          location: input.location,
          memo: input.memo,
        });
      } else {
        events.addEvent({
          title: input.title,
          date: input.date,
          startH: input.startH,
          endH: input.endH,
          color: input.color,
          location: input.location,
          memo: input.memo,
        });
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
      />
      <MonthTimeGrid
        daysOfMonth={month.daysOfMonth}
        eventsByDate={events.eventsByDate}
        theme={theme}
        onPressDay={handlePressDay}
        onPressEvent={handlePressEvent}
        onPressEmpty={handlePressEmpty}
        nowLineTop={now.topPx}
        nowLineVisible={now.visible}
        nowFractionalHour={now.hourFloat}
        monthKey={month.label}
        todayTick={todayTick}
      />

      <DetailSheet
        visible={detailOpen}
        event={selected}
        theme={theme}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
