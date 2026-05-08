import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GanttView } from '../../components/GanttView';
import { PeriodTimeSheet } from '../../components/PeriodTimeSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SubjectEditSheet } from '../../components/SubjectEditSheet';
import { TaskAddSheet, type TaskInput } from '../../components/TaskAddSheet';
import { TimetableGrid } from '../../components/TimetableGrid';
import { useSubjects } from '../../hooks/useSubjects';
import { useTasks } from '../../hooks/useTasks';
import { useTheme } from '../../hooks/useTheme';
import type { PeriodTime, Subject, Task } from '../../types/Task';

type Mode = 'gantt' | 'timetable';

export default function TasksScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tasks = useTasks();
  const subjects = useSubjects();

  const [mode, setMode] = useState<Mode>('gantt');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingSubjectCell, setEditingSubjectCell] = useState<{ day: number; period: number }>({
    day: 1,
    period: 1,
  });

  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [editingPeriodNum, setEditingPeriodNum] = useState(1);

  const courseSuggestions = useMemo(() => {
    const set = new Set<string>([...tasks.courses, ...subjects.subjectNames]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [tasks.courses, subjects.subjectNames]);

  const handleSelectMode = (m: Mode) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setMode(m);
  };

  const handleAdd = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const handlePressTask = useCallback((t: Task) => {
    setEditing(t);
    setEditorOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (input: TaskInput) => {
      if (input.id) {
        const { id, ...rest } = input;
        tasks.updateTask(id, rest);
      } else {
        const { id: _ignored, ...rest } = input;
        tasks.addTask(rest);
      }
      setEditorOpen(false);
      setEditing(null);
    },
    [tasks]
  );

  const handleDelete = useCallback(
    (id: string) => {
      tasks.removeTask(id);
      setEditorOpen(false);
      setEditing(null);
    },
    [tasks]
  );

  const handlePressCell = useCallback(
    (day: number, period: number) => {
      const existing = subjects.subjectsByCell.get(`${day}-${period}`) ?? null;
      setEditingSubject(existing);
      setEditingSubjectCell({ day, period });
      setSubjectSheetOpen(true);
    },
    [subjects.subjectsByCell]
  );

  const handleSaveSubject = useCallback(
    (input: { id?: string; name: string; color: string; day: number; period: number }) => {
      subjects.upsertSubject(input);
      setSubjectSheetOpen(false);
      setEditingSubject(null);
    },
    [subjects]
  );

  const handleDeleteSubject = useCallback(
    (id: string) => {
      subjects.removeSubject(id);
      setSubjectSheetOpen(false);
      setEditingSubject(null);
    },
    [subjects]
  );

  const handlePressPeriod = useCallback((period: number) => {
    setEditingPeriodNum(period);
    setPeriodSheetOpen(true);
  }, []);

  const handleSavePeriod = useCallback(
    (value: PeriodTime) => {
      subjects.updatePeriodTime(editingPeriodNum, value);
      setPeriodSheetOpen(false);
    },
    [subjects, editingPeriodNum]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScreenHeader
        title="課題"
        theme={theme}
        onAdd={handleAdd}
        bottom={
          <View style={[styles.segmented, { backgroundColor: theme.bgSecondary, marginTop: 10 }]}>
            <SegmentedBtn
              label="タイムライン"
              icon="calendar-outline"
              selected={mode === 'gantt'}
              onPress={() => handleSelectMode('gantt')}
              theme={theme}
            />
            <SegmentedBtn
              label="時間割"
              icon="grid-outline"
              selected={mode === 'timetable'}
              onPress={() => handleSelectMode('timetable')}
              theme={theme}
            />
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'gantt' ? (
          <View style={styles.section}>
            <SummaryRow tasks={tasks.tasks} theme={theme} />
            <GanttView
              tasks={tasks.tasks}
              theme={theme}
              onPressTask={handlePressTask}
              onToggleDone={tasks.toggleDone}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.hint, { color: theme.textTertiary }]}>
              セルをタップして科目を登録、時限ラベルをタップで時間を変更できます
            </Text>
            <TimetableGrid
              subjectsByCell={subjects.subjectsByCell}
              periodTimes={subjects.periodTimes}
              theme={theme}
              onPressCell={handlePressCell}
              onPressPeriod={handlePressPeriod}
            />
          </View>
        )}
      </ScrollView>

      <TaskAddSheet
        visible={editorOpen}
        theme={theme}
        initial={editing}
        courseSuggestions={courseSuggestions}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />

      <SubjectEditSheet
        visible={subjectSheetOpen}
        theme={theme}
        day={editingSubjectCell.day}
        period={editingSubjectCell.period}
        initial={editingSubject}
        suggestions={courseSuggestions}
        onClose={() => {
          setSubjectSheetOpen(false);
          setEditingSubject(null);
        }}
        onSave={handleSaveSubject}
        onDelete={handleDeleteSubject}
      />

      <PeriodTimeSheet
        visible={periodSheetOpen}
        theme={theme}
        period={editingPeriodNum}
        initial={subjects.periodTimes[editingPeriodNum] ?? { start: '09:00', end: '10:30' }}
        onClose={() => setPeriodSheetOpen(false)}
        onSave={handleSavePeriod}
        onReset={() => subjects.resetPeriodTime(editingPeriodNum)}
      />
    </View>
  );
}

function SegmentedBtn({
  label,
  icon,
  selected,
  onPress,
  theme,
}: {
  label: string;
  icon: any;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segBtn,
        selected && {
          backgroundColor: theme.bgElevated,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={selected ? theme.accent : theme.textSecondary}
      />
      <Text
        style={[
          styles.segLabel,
          { color: selected ? theme.accent : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({ tasks, theme }: { tasks: Task[]; theme: any }) {
  const open = tasks.filter((t) => !t.done).length;
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  return (
    <View style={styles.summaryRow}>
      <Stat label="未完了" value={open} theme={theme} accent={theme.accent} />
      <Stat label="完了" value={done} theme={theme} accent={theme.palette.green.fg} />
      <Stat label="合計" value={total} theme={theme} accent={theme.textSecondary} />
    </View>
  );
}

function Stat({
  label,
  value,
  theme,
  accent,
}: {
  label: string;
  value: number;
  theme: any;
  accent: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.bgSecondary, borderColor: theme.separator }]}>
      <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
