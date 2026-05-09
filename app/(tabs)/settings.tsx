import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../../components/BottomSheet';
import { PaywallSheet } from '../../components/PaywallSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useIAPContext } from '../../hooks/IAPContext';
import { useClassNotifications } from '../../hooks/useClassNotifications';
import { useEvents } from '../../hooks/useEvents';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useNotifyEnabled } from '../../hooks/useNotifyEnabled';
import { useSubjects } from '../../hooks/useSubjects';
import {
  ensureNotificationPermission,
  useTaskNotifications,
} from '../../hooks/useTaskNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useTheme } from '../../hooks/useTheme';
import { useWidgetSync } from '../../hooks/useWidgetSync';

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 15, 30, 45];

const LEAD_OPTIONS: { value: number; label: string }[] = [
  { value: -1, label: 'オフ' },
  { value: 0, label: '直前' },
  { value: 5, label: '5分前' },
  { value: 10, label: '10分前' },
  { value: 15, label: '15分前' },
  { value: 30, label: '30分前' },
  { value: 60, label: '1時間前' },
];

type PickerKind = null | 'time' | 'classStart' | 'classEnd';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { tasks } = useTasks();
  const events = useEvents();
  const subjects = useSubjects();
  const { enabled: notifyEnabled, setEnabled: setNotifyEnabled } = useNotifyEnabled();
  const { settings, update } = useNotificationSettings();

  useTaskNotifications(tasks, notifyEnabled, settings.taskTime);
  useClassNotifications(
    subjects.subjects,
    subjects.periodTimes,
    settings.classStartLead,
    settings.classEndLead,
    notifyEnabled
  );
  // ホーム画面ウィジェット同期 (今日の予定を App Group に書き出し)
  useWidgetSync(events.events, events.hydrated);

  const [picker, setPicker] = useState<PickerKind>(null);
  const iap = useIAPContext();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const [hStr, mStr] = settings.taskTime.split(':');
  const taskHour = Math.min(23, Math.max(0, Number(hStr) || 9));
  const taskMin = Math.min(59, Math.max(0, Number(mStr) || 0));

  const setTaskHour = (h: number) => update({ taskTime: `${pad(h)}:${pad(taskMin)}` });
  const setTaskMin = (m: number) => update({ taskTime: `${pad(taskHour)}:${pad(m)}` });

  const handleClearAll = () => {
    const proceed = async () => {
      await AsyncStorage.multiRemove([
        'schedule-app:events:v1',
        'schedule-app:seeded:v1',
        'schedule-app:tasks:v1',
        'schedule-app:tasks-seeded:v1',
        'schedule-app:subjects:v1',
        'schedule-app:period-times:v1',
        'schedule-app:title-presets:v1',
        'schedule-app:memos:v1',
        'schedule-app:memos-seeded:v1',
        'schedule-app:notify-enabled:v1',
        'schedule-app:notify-settings:v1',
      ]);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert('削除しました。ページをリロードしてください。');
      } else {
        Alert.alert('削除しました', 'アプリを再起動してください');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('全データを削除します。この操作は取り消せません。続行しますか？');
      if (ok) void proceed();
      return;
    }
    Alert.alert('全データを削除', 'この操作は取り消せません。続行しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => void proceed() },
    ]);
  };

  const handleToggleNotify = async () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const next = !notifyEnabled;
    if (next) {
      const ok = await ensureNotificationPermission();
      if (!ok && Platform.OS !== 'web') {
        Alert.alert('通知権限が必要です', '設定アプリから通知をオンにしてください', [{ text: 'OK' }]);
        return;
      }
    }
    await setNotifyEnabled(next);
  };

  const leadLabel = (v: number) =>
    LEAD_OPTIONS.find((o) => o.value === v)?.label ?? `${v}分前`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <ScreenHeader title="設定" theme={theme} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader theme={theme} title="通知" />
        <Group theme={theme}>
          <Row
            theme={theme}
            icon="notifications-outline"
            label="通知"
            sub="締切が近づくと通知します"
            right={
              <ToggleBtn
                theme={theme}
                active={notifyEnabled}
                onPress={handleToggleNotify}
                disabled={Platform.OS === 'web'}
              />
            }
            divider
          />
          <Row
            theme={theme}
            icon="time-outline"
            label="通知時刻"
            sub="毎日この時刻に通知を送信"
            right={
              <ValueBtn
                theme={theme}
                value={`${taskHour}:${pad(taskMin)}`}
                onPress={() => setPicker('time')}
                disabled={!notifyEnabled}
              />
            }
            disabled={!notifyEnabled}
            divider
          />
          <Row
            theme={theme}
            icon="book-outline"
            label="授業の通知"
            sub="授業の開始前に通知します"
            right={
              <ValueBtn
                theme={theme}
                value={leadLabel(settings.classStartLead)}
                onPress={() => setPicker('classStart')}
                showCaret
                disabled={!notifyEnabled}
              />
            }
            disabled={!notifyEnabled}
            divider
          />
          <Row
            theme={theme}
            icon="create-outline"
            label="課題登録のリマインダー"
            sub="授業の終了直前に課題の登録を促します"
            right={
              <ValueBtn
                theme={theme}
                value={leadLabel(settings.classEndLead)}
                onPress={() => setPicker('classEnd')}
                showCaret
                disabled={!notifyEnabled}
              />
            }
            disabled={!notifyEnabled}
          />
        </Group>

        <SectionHeader theme={theme} title="表示" />
        <Group theme={theme}>
          <InfoRow
            theme={theme}
            icon={scheme === 'dark' ? 'moon' : 'sunny'}
            label="外観モード"
            value={scheme === 'dark' ? 'ダーク' : 'ライト'}
          />
        </Group>

        <SectionHeader theme={theme} title="Pro" />
        <Group theme={theme}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setPaywallOpen(true);
            }}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={iap.isPro ? 'sparkles' : 'sparkles-outline'}
              size={20}
              color={theme.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                {iap.isPro ? 'Cadence Pro' : 'Cadence Pro にアップグレード'}
              </Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                {iap.isPro
                  ? 'すべての Pro 機能を利用中'
                  : '記録ダッシュボード・テーマ・iCloud 同期など'}
              </Text>
            </View>
            {iap.isPro ? (
              <View style={[styles.proBadge, { backgroundColor: theme.palette.green.bg }]}>
                <Text style={[styles.proBadgeText, { color: theme.palette.green.fg }]}>
                  ご利用中
                </Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            )}
          </Pressable>
        </Group>

        <SectionHeader theme={theme} title="データ" />
        <Group theme={theme}>
          <Pressable
            onPress={handleClearAll}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="trash-outline" size={20} color={theme.palette.red.fg} />
            <Text style={[styles.rowLabelOnly, { color: theme.palette.red.fg }]}>
              全データを削除
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>
        </Group>
      </ScrollView>

      <BottomSheet
        visible={picker === 'time'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.6}
      >
        <PickerHeader theme={theme} title="通知時刻" onDone={() => setPicker(null)} />
        <View style={pickerStyles.body}>
          <Text style={[pickerStyles.label, { color: theme.textTertiary }]}>時</Text>
          <PillScroll
            options={HOURS_OPTIONS.map((h) => ({ value: h, label: `${pad(h)}時` }))}
            value={taskHour}
            onChange={setTaskHour}
            theme={theme}
          />
          <View style={{ height: 14 }} />
          <Text style={[pickerStyles.label, { color: theme.textTertiary }]}>分</Text>
          <PillScroll
            options={MINUTE_OPTIONS.map((m) => ({ value: m, label: `${pad(m)}分` }))}
            value={taskMin}
            onChange={setTaskMin}
            theme={theme}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={picker === 'classStart'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.5}
      >
        <PickerHeader theme={theme} title="授業の通知" onDone={() => setPicker(null)} />
        <View style={pickerStyles.body}>
          <PillScroll
            options={LEAD_OPTIONS}
            value={settings.classStartLead}
            onChange={(v) => update({ classStartLead: v })}
            theme={theme}
            wrap
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={picker === 'classEnd'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.5}
      >
        <PickerHeader
          theme={theme}
          title="課題登録のリマインダー"
          onDone={() => setPicker(null)}
        />
        <View style={pickerStyles.body}>
          <PillScroll
            options={LEAD_OPTIONS}
            value={settings.classEndLead}
            onChange={(v) => update({ classEndLead: v })}
            theme={theme}
            wrap
          />
        </View>
      </BottomSheet>

      <PaywallSheet
        visible={paywallOpen}
        theme={theme}
        isPro={iap.isPro}
        product={iap.product}
        busy={iap.busy}
        error={iap.error}
        onClose={() => setPaywallOpen(false)}
        onPurchase={async () => {
          const ok = await iap.purchase();
          if (ok) setPaywallOpen(false);
        }}
        onRestore={async () => {
          const ok = await iap.restore();
          if (ok) setPaywallOpen(false);
        }}
      />
    </View>
  );
}

function PickerHeader({
  theme,
  title,
  onDone,
}: {
  theme: any;
  title: string;
  onDone: () => void;
}) {
  return (
    <View style={pickerStyles.header}>
      <View style={{ width: 70 }} />
      <Text style={[pickerStyles.headerTitle, { color: theme.text }]}>{title}</Text>
      <Pressable onPress={onDone} hitSlop={10} style={{ width: 70, alignItems: 'flex-end' }}>
        <Text style={[pickerStyles.headerBtn, { color: theme.accent }]}>完了</Text>
      </Pressable>
    </View>
  );
}

function Row({
  theme,
  icon,
  label,
  sub,
  right,
  divider,
  disabled,
}: {
  theme: any;
  icon: any;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  divider?: boolean;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        divider && { borderBottomColor: theme.separator, borderBottomWidth: StyleSheet.hairlineWidth },
        { opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.textSecondary} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: theme.textTertiary }]} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function ToggleBtn({
  theme,
  active,
  onPress,
  disabled,
}: {
  theme: any;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: active ? theme.accent : theme.bg,
          borderColor: active ? theme.accent : theme.separator,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={active ? 'notifications' : 'notifications-outline'}
        size={22}
        color={active ? '#fff' : theme.textSecondary}
      />
    </Pressable>
  );
}

function ValueBtn({
  theme,
  value,
  onPress,
  showCaret,
  disabled,
}: {
  theme: any;
  value: string;
  onPress: () => void;
  showCaret?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.valueBtn,
        {
          backgroundColor: theme.bg,
          borderColor: theme.separator,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.valueText, { color: theme.text }]}>{value}</Text>
      {showCaret ? (
        <Ionicons
          name="chevron-expand-outline"
          size={14}
          color={theme.textSecondary}
          style={{ marginLeft: 6 }}
        />
      ) : null}
    </Pressable>
  );
}

function PillScroll<T extends number>({
  options,
  value,
  onChange,
  theme,
  wrap,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  theme: any;
  wrap?: boolean;
}) {
  if (wrap) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <PillItem key={String(opt.value)} opt={opt} value={value} onChange={onChange} theme={theme} />
        ))}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingRight: 12 }}
    >
      {options.map((opt) => (
        <PillItem key={String(opt.value)} opt={opt} value={value} onChange={onChange} theme={theme} />
      ))}
    </ScrollView>
  );
}

function PillItem<T extends number>({
  opt,
  value,
  onChange,
  theme,
}: {
  opt: { value: T; label: string };
  value: T;
  onChange: (v: T) => void;
  theme: any;
}) {
  const sel = opt.value === value;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onChange(opt.value);
      }}
      style={[
        pickerStyles.pill,
        {
          backgroundColor: sel ? theme.accent : theme.bgSecondary,
          borderColor: sel ? theme.accent : theme.separator,
        },
      ]}
    >
      <Text style={[pickerStyles.pillText, { color: sel ? '#fff' : theme.text }]}>
        {opt.label}
      </Text>
    </Pressable>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function StatCard({
  theme,
  label,
  value,
  unit,
}: {
  theme: any;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
      ]}
    >
      <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statUnit, { color: theme.textSecondary }]}>{unit}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ theme, title }: any) {
  return <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{title}</Text>;
}

function Group({ theme, children }: any) {
  return (
    <View
      style={[styles.group, { backgroundColor: theme.bgSecondary, borderColor: theme.separator }]}
    >
      {children}
    </View>
  );
}

function InfoRow({
  theme,
  icon,
  label,
  value,
}: {
  theme: any;
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} style={{ width: 28 }} />
      <Text style={[styles.rowLabelOnly, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  group: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    lineHeight: 16,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowLabelOnly: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  iconBtn: {
    width: 56,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  valueBtn: {
    minWidth: 78,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
});

const pickerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerBtn: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
