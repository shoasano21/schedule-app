import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { StudySession } from '../types/StudySession';
import { BottomSheet } from './BottomSheet';

type Phase = 'idle' | 'focus' | 'break';

interface Props {
  visible: boolean;
  theme: Theme;
  initialTitle?: string;
  initialColor?: string;
  onClose: () => void;
  onLog: (session: Omit<StudySession, 'id'>) => void;
}

const FOCUS_OPTIONS = [15, 25, 45, 60];
const BREAK_OPTIONS = [5, 10, 15];

export function PomodoroSheet({
  visible,
  theme,
  initialTitle,
  initialColor,
  onClose,
  onLog,
}: Props) {
  const [titleDraft, setTitleDraft] = useState(initialTitle ?? '');
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(25 * 60);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      // Reset state when sheet closes
      stopTick();
      setPhase('idle');
      setRemaining(focusMin * 60);
      accumulatedRef.current = 0;
      return;
    }
    setTitleDraft(initialTitle ?? '');
    setRemaining(focusMin * 60);
    accumulatedRef.current = 0;
    setPhase('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTitle]);

  const stopTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopTick(), []);

  const startTick = () => {
    stopTick();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // 完了処理
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePhaseEnd = () => {
    stopTick();
    if (phase === 'focus') {
      // フォーカス完了 → セッション記録
      const elapsedSec = focusMin * 60;
      onLog({
        eventTitle: titleDraft.trim() || undefined,
        eventColor: initialColor,
        startedAt: startedAtRef.current,
        durationSec: elapsedSec,
        completed: true,
      });
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // 自動的に休憩へ
      setPhase('break');
      setRemaining(breakMin * 60);
      startedAtRef.current = Date.now();
      // Restart tick automatically for break
      setTimeout(startTick, 100);
    } else if (phase === 'break') {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('idle');
      setRemaining(focusMin * 60);
    }
  };

  const handleStart = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    startedAtRef.current = Date.now();
    setPhase('focus');
    setRemaining(focusMin * 60);
    setTimeout(startTick, 50);
  };

  const handlePause = () => {
    stopTick();
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  const handleResume = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    startTick();
  };

  const handleStop = () => {
    stopTick();
    // 中断時も部分セッションを記録 (1分以上集中していた場合のみ)
    if (phase === 'focus') {
      const elapsedSec = focusMin * 60 - remaining;
      if (elapsedSec >= 60) {
        onLog({
          eventTitle: titleDraft.trim() || undefined,
          eventColor: initialColor,
          startedAt: startedAtRef.current,
          durationSec: elapsedSec,
          completed: false,
        });
      }
    }
    setPhase('idle');
    setRemaining(focusMin * 60);
  };

  const isRunning = !!intervalRef.current;
  const isFocus = phase === 'focus';
  const isBreak = phase === 'break';

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  const totalSec = (isBreak ? breakMin : focusMin) * 60;
  const progress = totalSec > 0 ? 1 - remaining / totalSec : 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.7}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            if (isRunning) handleStop();
            onClose();
          }}
          hitSlop={10}
        >
          <Text style={[styles.headerBtn, { color: theme.accent }]}>閉じる</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>集中タイマー</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.phaseBadge, { backgroundColor: isBreak ? theme.palette.green.bg : theme.accentBg }]}>
          <Ionicons
            name={isBreak ? 'cafe-outline' : 'flame'}
            size={14}
            color={isBreak ? theme.palette.green.fg : theme.accent}
          />
          <Text
            style={[
              styles.phaseLabel,
              { color: isBreak ? theme.palette.green.fg : theme.accent },
            ]}
          >
            {isBreak ? '休憩中' : isFocus ? '集中中' : 'スタンバイ'}
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {titleDraft.trim() || '集中セッション'}
        </Text>

        <View
          style={[
            styles.timerCircle,
            {
              borderColor: isBreak ? theme.palette.green.fg : theme.accent,
              backgroundColor: theme.bgSecondary,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                height: `${progress * 100}%`,
                backgroundColor: isBreak ? theme.palette.green.bg : theme.accentBg,
              },
            ]}
          />
          <View style={styles.timerCenter}>
            <Text style={[styles.timerText, { color: theme.text }]}>
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </Text>
            <Text style={[styles.timerSub, { color: theme.textTertiary }]}>
              {isBreak ? `${breakMin} 分の休憩` : `${focusMin} 分の集中`}
            </Text>
          </View>
        </View>

        {phase === 'idle' ? (
          <>
            <Text style={[styles.label, { color: theme.textTertiary }]}>集中時間</Text>
            <View style={styles.optionRow}>
              {FOCUS_OPTIONS.map((m) => {
                const sel = focusMin === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setFocusMin(m);
                      setRemaining(m * 60);
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: sel ? theme.accent : theme.bgSecondary,
                        borderColor: sel ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: sel ? '#fff' : theme.text }]}>
                      {m}分
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.textTertiary, marginTop: 12 }]}>
              休憩時間
            </Text>
            <View style={styles.optionRow}>
              {BREAK_OPTIONS.map((m) => {
                const sel = breakMin === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setBreakMin(m)}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: sel ? theme.accent : theme.bgSecondary,
                        borderColor: sel ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: sel ? '#fff' : theme.text }]}>
                      {m}分
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.bigBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.bigBtnText}>スタート</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.controlRow}>
            {isRunning ? (
              <Pressable
                onPress={handlePause}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: theme.bgSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="pause" size={22} color={theme.text} />
                <Text style={[styles.controlText, { color: theme.text }]}>一時停止</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleResume}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="play" size={22} color="#fff" />
                <Text style={[styles.controlText, { color: '#fff' }]}>再開</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: theme.palette.red.bg, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="stop" size={22} color={theme.palette.red.fg} />
              <Text style={[styles.controlText, { color: theme.palette.red.fg }]}>
                終了
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: 15,
    minWidth: 60,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  progressFill: {
    width: '100%',
  },
  timerCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'stretch',
  },
  optionChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'stretch',
    marginTop: 18,
  },
  bigBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  controlText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
