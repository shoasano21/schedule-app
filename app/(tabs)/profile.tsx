import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '../../hooks/useEvents';
import { useNotifyEnabled } from '../../hooks/useNotifyEnabled';
import { ensureNotificationPermission } from '../../hooks/useTaskNotifications';
import { useTasks } from '../../hooks/useTasks';
import { useTheme } from '../../hooks/useTheme';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { enabled: notifyEnabled, setEnabled: setNotifyEnabled } = useNotifyEnabled();

  const handleClearAll = () => {
    Alert.alert(
      '全データを削除',
      'この操作は取り消せません。続行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'schedule-app:events:v1',
              'schedule-app:seeded:v1',
              'schedule-app:tasks:v1',
              'schedule-app:tasks-seeded:v1',
              'schedule-app:subjects:v1',
              'schedule-app:period-times:v1',
              'schedule-app:title-presets:v1',
            ]);
            if (Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert('削除しました', 'アプリを再起動してください');
          },
        },
      ]
    );
  };

  const handleToggleNotify = async (next: boolean) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (next) {
      const ok = await ensureNotificationPermission();
      if (!ok && Platform.OS !== 'web') {
        Alert.alert(
          '通知権限が必要です',
          '設定アプリから通知をオンにしてください',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    await setNotifyEnabled(next);
  };

  const totalHours = events.reduce((n, e) => n + (e.endH - e.startH), 0);

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: theme.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>プロフィール</Text>
      </View>

      <View
        style={[
          styles.profileCard,
          { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Ionicons name="person" size={32} color="#fff" />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>あなた</Text>
        <Text style={[styles.subtle, { color: theme.textTertiary }]}>
          スケジュール管理を続けて{events.length}件の予定を作成しました
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard theme={theme} label="登録イベント" value={`${events.length}`} unit="件" />
        <StatCard theme={theme} label="登録課題" value={`${tasks.length}`} unit="件" />
      </View>

      <SectionHeader theme={theme} title="通知" />
      <Group theme={theme}>
        <View style={styles.row}>
          <Ionicons
            name={notifyEnabled ? 'notifications' : 'notifications-off-outline'}
            size={18}
            color={notifyEnabled ? theme.accent : theme.textTertiary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>課題リマインダー</Text>
            <Text style={[styles.rowSub, { color: theme.textTertiary }]}>
              {Platform.OS === 'web'
                ? 'iPhone/Androidで朝9時に通知 (Webでは無効)'
                : '締切のN日前に朝9時に通知'}
            </Text>
          </View>
          <Switch
            value={notifyEnabled}
            onValueChange={handleToggleNotify}
            trackColor={{ true: theme.accent, false: theme.separator }}
            disabled={Platform.OS === 'web'}
          />
        </View>
      </Group>

      <SectionHeader theme={theme} title="表示設定" />
      <Group theme={theme}>
        <InfoRow
          theme={theme}
          icon={scheme === 'dark' ? 'moon' : 'sunny'}
          label="外観モード"
          value={scheme === 'dark' ? 'ダーク' : 'ライト'}
        />
        <InfoRow
          theme={theme}
          icon="time-outline"
          label="表示時間帯"
          value="6:00 — 21:00"
        />
      </Group>

      <SectionHeader theme={theme} title="データ" />
      <Group theme={theme}>
        <Pressable
          onPress={handleClearAll}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.palette.red.fg} />
          <Text style={[styles.rowLabel, { color: theme.palette.red.fg }]}>
            全データを削除
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
        </Pressable>
      </Group>

      <SectionHeader theme={theme} title="アプリ情報" />
      <Group theme={theme}>
        <InfoRow theme={theme} icon="information-circle-outline" label="バージョン" value="1.0.0" />
        <InfoRow theme={theme} icon="phone-portrait-outline" label="プラットフォーム" value={Platform.OS} />
      </Group>

      <Text style={[styles.footer, { color: theme.textTertiary }]}>
        Made with React Native + Expo
      </Text>
    </ScrollView>
  );
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
  return (
    <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{title}</Text>
  );
}

function Group({ theme, children }: any) {
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
      ]}
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
      <Ionicons name={icon} size={18} color={theme.textTertiary} />
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  profileCard: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    paddingHorizontal: 20,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
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
    paddingVertical: 12,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 18,
  },
});
