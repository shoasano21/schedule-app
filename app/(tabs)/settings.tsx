import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
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
import { ACCENT_IDS, ACCENT_PRESETS, type AccentId } from '../../constants/accents';
import { BottomSheet } from '../../components/BottomSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SyllabusImportSheet } from '../../components/SyllabusImportSheet';
import { usePreferences } from '../../hooks/PreferencesContext';
import { useClassNotifications } from '../../hooks/useClassNotifications';
import { useBackup } from '../../hooks/useBackup';
import { useICSExport } from '../../hooks/useICSExport';
import { useEvents } from '../../hooks/useEvents';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useNotifyEnabled } from '../../hooks/useNotifyEnabled';
import { useSubjects } from '../../hooks/useSubjects';
import {
  ensureNotificationPermission,
  useTaskNotifications,
} from '../../hooks/useTaskNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useICSImport } from '../../hooks/useICSImport';
import { useTheme } from '../../hooks/useTheme';
import { useTomorrowPrepNotifications } from '../../hooks/useTomorrowPrep';
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

type PickerKind =
  | null
  | 'time'
  | 'classStart'
  | 'classEnd'
  | 'gridStart'
  | 'gridEnd'
  | 'tomorrowPrep';

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
  useTomorrowPrepNotifications(events.events, settings.tomorrowPrepTime, notifyEnabled);
  // ホーム画面ウィジェット同期 (今日の予定を App Group に書き出し)
  useWidgetSync(events.events, events.hydrated);

  const [picker, setPicker] = useState<PickerKind>(null);
  const prefs = usePreferences();
  const ics = useICSExport();
  const icsImport = useICSImport();
  const backup = useBackup();
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  const handleImportICS = async () => {
    const list = await icsImport.pickAndParse();
    if (!list) return;
    let added = 0;
    for (const item of list) {
      events.addEvent(item);
      added += 1;
    }
    icsImport.setInfo(`${added} 件の予定を取り込みました`);
  };

  const handleExportICS = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ics.exportICS(events.events, `cadence-${new Date().toISOString().slice(0, 10)}.ics`);
  };

  const handleBackup = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await backup.exportBackup();
  };

  const handleRestore = async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      const ok = window.confirm(
        'バックアップを読み込みます。既存のデータは上書きされます。続行しますか？'
      );
      if (!ok) return;
      await backup.importBackup();
      return;
    }
    Alert.alert(
      'バックアップを読み込む',
      '既存のデータは上書きされます。続行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '続行',
          style: 'destructive',
          onPress: async () => {
            const ok = await backup.importBackup();
            if (ok) {
              Alert.alert('復元完了', 'データを復元しました。アプリを再起動してください');
            }
          },
        },
      ]
    );
  };

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
            divider
          />
          <Row
            theme={theme}
            icon="moon-outline"
            label="明日の予定通知"
            sub="毎晩、翌日の予定をプレビュー"
            right={
              <ValueBtn
                theme={theme}
                value={settings.tomorrowPrepTime ?? 'オフ'}
                onPress={() => setPicker('tomorrowPrep')}
                showCaret
                disabled={!notifyEnabled}
              />
            }
            disabled={!notifyEnabled}
          />
        </Group>

        <SectionHeader theme={theme} title="表示" />
        <Group theme={theme}>
          <View style={styles.col}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>外観モード</Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, marginBottom: 12 }]}>
              {prefs.appearance === 'system'
                ? `端末の設定に従う (現在: ${scheme === 'dark' ? 'ダーク' : 'ライト'})`
                : prefs.appearance === 'dark'
                ? '常にダーク'
                : '常にライト'}
            </Text>
            <View style={styles.appearanceRow}>
              {(
                [
                  { key: 'system', label: '自動', icon: 'phone-portrait-outline' },
                  { key: 'light', label: 'ライト', icon: 'sunny-outline' },
                  { key: 'dark', label: 'ダーク', icon: 'moon-outline' },
                ] as const
              ).map((opt) => {
                const selected = prefs.appearance === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      prefs.setAppearance(opt.key);
                    }}
                    style={[
                      styles.appearanceBtn,
                      {
                        backgroundColor: selected ? theme.accent : theme.bgSecondary,
                        borderColor: selected ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={selected ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.appearanceLabel,
                        { color: selected ? '#fff' : theme.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        <SectionHeader theme={theme} title="天気" />
        <Group theme={theme}>
          <Row
            theme={theme}
            icon="partly-sunny-outline"
            label="天気アイコンを表示"
            sub="月間ヘッダーに毎日の天気 (東京・Open-Meteo・約14日先)"
            right={
              <ToggleBtn
                theme={theme}
                active={prefs.weatherEnabled}
                onPress={() => prefs.setWeatherEnabled(!prefs.weatherEnabled)}
              />
            }
          />
        </Group>

        <SectionHeader theme={theme} title="月間グリッド表示時間" />
        <Group theme={theme}>
          <View style={styles.col}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              {prefs.gridStartHour.toString().padStart(2, '0')}:00 〜{' '}
              {prefs.gridEndHour.toString().padStart(2, '0')}:00
            </Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, marginBottom: 8 }]}>
              月間スケジュールに表示する時間帯
            </Text>
            <View style={styles.gridRangeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rangeLabel, { color: theme.textTertiary }]}>開始</Text>
                <Pressable
                  onPress={() => setPicker('gridStart')}
                  style={[
                    styles.rangeBtn,
                    { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
                  ]}
                >
                  <Text style={[styles.rangeValue, { color: theme.text }]}>
                    {prefs.gridStartHour.toString().padStart(2, '0')}:00
                  </Text>
                </Pressable>
              </View>
              <Ionicons name="arrow-forward" size={14} color={theme.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rangeLabel, { color: theme.textTertiary }]}>終了</Text>
                <Pressable
                  onPress={() => setPicker('gridEnd')}
                  style={[
                    styles.rangeBtn,
                    { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
                  ]}
                >
                  <Text style={[styles.rangeValue, { color: theme.text }]}>
                    {prefs.gridEndHour.toString().padStart(2, '0')}:00
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.presetRow}>
              {[
                { label: '0–24', s: 0, e: 24 },
                { label: '6–22', s: 6, e: 22 },
                { label: '7–20', s: 7, e: 20 },
                { label: '8–18', s: 8, e: 18 },
              ].map((p) => {
                const active =
                  prefs.gridStartHour === p.s && prefs.gridEndHour === p.e;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => prefs.setGridRange(p.s, p.e)}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: active ? theme.accent : theme.bgSecondary,
                        borderColor: active ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        { color: active ? '#fff' : theme.text },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        <SectionHeader theme={theme} title="テーマカラー" />
        <Group theme={theme}>
          <View style={styles.col}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>アクセントカラー</Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary, marginBottom: 12 }]}>
              アプリ全体のアクセントカラーを変更
            </Text>
            <View style={styles.swatchRow}>
              {ACCENT_IDS.map((id) => {
                const preset = ACCENT_PRESETS[id];
                const variant = scheme === 'dark' ? preset.dark : preset.light;
                const selected = prefs.accent === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      prefs.setAccent(id);
                    }}
                    style={[
                      styles.swatchOuter,
                      selected && {
                        borderColor: variant.fg,
                      },
                    ]}
                  >
                    <View style={[styles.swatch, { backgroundColor: variant.fg }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        <SectionHeader theme={theme} title="データ" />
        <Group theme={theme}>
          <Pressable
            onPress={handleExportICS}
            disabled={ics.busy}
            style={({ pressed }) => [
              styles.row,
              { opacity: ics.busy ? 0.5 : pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="download-outline" size={20} color={theme.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                カレンダー書き出し
              </Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                .ics 形式で iOS / Google カレンダーに連携
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            onPress={handleImportICS}
            disabled={icsImport.busy}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: theme.separator,
                borderTopWidth: StyleSheet.hairlineWidth,
                opacity: icsImport.busy ? 0.5 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={20} color={theme.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                カレンダー取り込み
              </Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                .ics ファイルから一括追加 (Apple/Google から書き出し)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            onPress={() => setSyllabusOpen(true)}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: theme.separator,
                borderTopWidth: StyleSheet.hairlineWidth,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="grid-outline" size={20} color={theme.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                時間割インポート
              </Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                CSV / TSV で曜日 + 時限 + 科目名を一括登録
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            onPress={handleBackup}
            disabled={backup.busy}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: theme.separator,
                borderTopWidth: StyleSheet.hairlineWidth,
                opacity: backup.busy ? 0.5 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={theme.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>バックアップを書き出し</Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                すべてのデータを JSON で保存（機種変更時に便利）
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>

          <Pressable
            onPress={handleRestore}
            disabled={backup.busy}
            style={({ pressed }) => [
              styles.row,
              {
                borderTopColor: theme.separator,
                borderTopWidth: StyleSheet.hairlineWidth,
                opacity: backup.busy ? 0.5 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={20} color={theme.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>バックアップから復元</Text>
              <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
                書き出した JSON ファイルを読み込んで復元
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </Pressable>
        </Group>

        {backup.info ? (
          <Text style={[styles.infoText, { color: theme.palette.green.fg }]}>{backup.info}</Text>
        ) : null}
        {backup.error ? (
          <Text style={[styles.infoText, { color: theme.palette.red.fg }]}>{backup.error}</Text>
        ) : null}
        {icsImport.info ? (
          <Text style={[styles.infoText, { color: theme.palette.green.fg }]}>{icsImport.info}</Text>
        ) : null}
        {icsImport.error ? (
          <Text style={[styles.infoText, { color: theme.palette.red.fg }]}>{icsImport.error}</Text>
        ) : null}

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

        <Text style={[styles.versionText, { color: theme.textTertiary }]}>
          Cadence v
          {Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '?'}
          {Constants.nativeBuildVersion
            ? ` (${Constants.nativeBuildVersion})`
            : Constants.expoConfig?.ios?.buildNumber
            ? ` (${Constants.expoConfig.ios.buildNumber})`
            : ''}
        </Text>
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

      <BottomSheet
        visible={picker === 'gridStart'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.5}
      >
        <PickerHeader theme={theme} title="表示開始時刻" onDone={() => setPicker(null)} />
        <View style={pickerStyles.body}>
          <PillScroll
            options={Array.from({ length: 24 }, (_, h) => ({
              value: h,
              label: `${h.toString().padStart(2, '0')}:00`,
            }))}
            value={prefs.gridStartHour}
            onChange={(v) => {
              const e = v < prefs.gridEndHour ? prefs.gridEndHour : Math.min(24, v + 1);
              prefs.setGridRange(v, e);
            }}
            theme={theme}
            wrap
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={picker === 'gridEnd'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.5}
      >
        <PickerHeader theme={theme} title="表示終了時刻" onDone={() => setPicker(null)} />
        <View style={pickerStyles.body}>
          <PillScroll
            options={Array.from({ length: 24 }, (_, i) => ({
              value: i + 1,
              label: `${(i + 1).toString().padStart(2, '0')}:00`,
            }))}
            value={prefs.gridEndHour}
            onChange={(v) => {
              const s = v > prefs.gridStartHour ? prefs.gridStartHour : Math.max(0, v - 1);
              prefs.setGridRange(s, v);
            }}
            theme={theme}
            wrap
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={picker === 'tomorrowPrep'}
        onClose={() => setPicker(null)}
        theme={theme}
        maxHeightRatio={0.5}
      >
        <PickerHeader theme={theme} title="明日の予定通知" onDone={() => setPicker(null)} />
        <View style={pickerStyles.body}>
          <PillScroll
            options={[
              { value: -1, label: 'オフ' },
              ...[18, 19, 20, 21, 22, 23].map((h) => ({
                value: h,
                label: `${String(h).padStart(2, '0')}:00`,
              })),
            ]}
            value={
              settings.tomorrowPrepTime === null
                ? -1
                : Number(settings.tomorrowPrepTime.split(':')[0])
            }
            onChange={(v) => {
              update({
                tomorrowPrepTime: v === -1 ? null : `${String(v).padStart(2, '0')}:00`,
              });
            }}
            theme={theme}
            wrap
          />
        </View>
      </BottomSheet>

      <SyllabusImportSheet
        visible={syllabusOpen}
        theme={theme}
        onClose={() => setSyllabusOpen(false)}
        onImport={(list) => {
          for (const s of list) {
            subjects.upsertSubject(s);
          }
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
        styles.switchTrack,
        {
          backgroundColor: active ? theme.accent : theme.separator,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.switchKnob,
          { transform: [{ translateX: active ? 18 : 0 }] },
        ]}
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
  col: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    letterSpacing: 0.4,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appearanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  appearanceLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rangeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  rangeBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  rangeValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  infoText: {
    paddingHorizontal: 24,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -10,
    marginBottom: 18,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    fontVariant: ['tabular-nums'],
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
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
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
