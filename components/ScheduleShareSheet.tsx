import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import type { SharedSchedule } from '../types/SharedSchedule';
import { BottomSheet } from './BottomSheet';
import { QRScanModal } from './QRScanModal';
import { QRShareModal } from './QRShareModal';

interface Props {
  visible: boolean;
  theme: Theme;
  activeId: string | null;
  onClose: () => void;
  onSelectSelf: () => void;
  onSelectShared: (id: string) => void;

  schedules: SharedSchedule[];
  shareName: string;
  myEvents: EventItem[];
  busy: boolean;
  error: string | null;
  info: string | null;
  prepareQRPayload: (events: EventItem[], name: string) => { qr: string | null; tooLarge: boolean };
  ingestQRPayload: (text: string) => SharedSchedule | null;
  onRemove: (id: string) => void;
  onClearMessages: () => void;
}

export function ScheduleShareSheet({
  visible,
  theme,
  activeId,
  onClose,
  onSelectSelf,
  onSelectShared,
  schedules,
  shareName,
  myEvents,
  busy,
  error,
  info,
  prepareQRPayload,
  ingestQRPayload,
  onRemove,
  onClearMessages,
}: Props) {
  const [nameDraft, setNameDraft] = useState('');
  const [qrPayload, setQRPayload] = useState<string | null>(null);
  const [qrTooLarge, setQRTooLarge] = useState(false);
  const [qrModalOpen, setQRModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setNameDraft(shareName);
      onClearMessages();
    }
  }, [visible, shareName, onClearMessages]);

  const handleShowQR = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    const trimmed = nameDraft.trim() || '無名';
    const { qr, tooLarge } = prepareQRPayload(myEvents, trimmed);
    if (!qr) return;
    setQRPayload(qr);
    setQRTooLarge(tooLarge);
    setQRModalOpen(true);
  };

  const handleScan = () => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setScanModalOpen(true);
  };

  const handleScanned = (text: string) => {
    const imported = ingestQRPayload(text);
    setScanModalOpen(false);
    if (imported) {
      onSelectShared(imported.id);
    }
  };

  const handleRemove = (s: SharedSchedule) => {
    const confirmDelete = () => onRemove(s.id);
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(`「${s.name}」のスケジュールを削除しますか？`);
      if (ok) confirmDelete();
      return;
    }
    Alert.alert(
      '取り込んだスケジュールを削除',
      `「${s.name}」さんのスケジュールを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[styles.headerBtn, { color: theme.accent }]}>閉じる</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>共有・切替</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: theme.textTertiary }]}>表示中のスケジュール</Text>

            <ScheduleRow
              theme={theme}
              iconName="person-circle"
              title="自分のスケジュール"
              subtitle={`${myEvents.length} 件`}
              active={activeId === null}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                onSelectSelf();
              }}
            />

            {schedules.map((s) => (
              <ScheduleRow
                key={s.id}
                theme={theme}
                iconName="people-circle"
                title={`${s.name} さん`}
                subtitle={`${s.events.length} 件 ・ 取込: ${formatDate(s.importedAt)}`}
                active={activeId === s.id}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  onSelectShared(s.id);
                }}
                onRemove={() => handleRemove(s)}
              />
            ))}

            <View style={[styles.divider, { backgroundColor: theme.separator }]} />

            <Text style={[styles.label, { color: theme.textTertiary }]}>QR で共有する</Text>
            <Text style={[styles.helper, { color: theme.textTertiary }]}>
              名前を入力 → QR 表示 → 相手のカメラで読み取り
            </Text>

            <View style={styles.nameRow}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="あなたの表示名 (例: 山田)"
                placeholderTextColor={theme.textTertiary}
                maxLength={24}
                style={[
                  styles.input,
                  { backgroundColor: theme.bgSecondary, color: theme.text },
                ]}
                returnKeyType="done"
              />
            </View>

            <Pressable
              onPress={handleShowQR}
              disabled={busy || myEvents.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: busy || myEvents.length === 0 ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="qr-code-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>QR を表示</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.separator }]} />

            <Text style={[styles.label, { color: theme.textTertiary }]}>QR を読み取る</Text>
            <Text style={[styles.helper, { color: theme.textTertiary }]}>
              相手の Cadence が表示している QR コードをカメラで読み取ります
            </Text>
            <Pressable
              onPress={handleScan}
              disabled={busy}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.secondaryBtn,
                {
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.accent,
                  opacity: busy ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={18} color={theme.accent} />
              <Text style={[styles.actionBtnText, { color: theme.accent }]}>カメラで読み取る</Text>
            </Pressable>

            {error ? (
              <View style={[styles.msg, { backgroundColor: theme.palette.red.bg }]}>
                <Ionicons name="alert-circle" size={16} color={theme.palette.red.fg} />
                <Text style={[styles.msgText, { color: theme.palette.red.fg }]}>{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View style={[styles.msg, { backgroundColor: theme.palette.green.bg }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.palette.green.fg} />
                <Text style={[styles.msgText, { color: theme.palette.green.fg }]}>{info}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </BottomSheet>

      <QRShareModal
        visible={qrModalOpen}
        payload={qrPayload}
        name={nameDraft.trim() || '無名'}
        eventCount={myEvents.length}
        tooLarge={qrTooLarge}
        theme={theme}
        onClose={() => setQRModalOpen(false)}
      />

      <QRScanModal
        visible={scanModalOpen}
        theme={theme}
        onClose={() => setScanModalOpen(false)}
        onScanned={handleScanned}
      />
    </>
  );
}

function ScheduleRow({
  theme,
  iconName,
  title,
  subtitle,
  active,
  onPress,
  onRemove,
}: {
  theme: Theme;
  iconName: any;
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: active ? theme.accentBg : theme.bgSecondary,
          borderColor: active ? theme.accent : theme.separator,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={iconName} size={28} color={active ? theme.accent : theme.textTertiary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: active ? theme.accent : theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.rowSub, { color: theme.textTertiary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {active ? (
        <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
      ) : null}
      {onRemove ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onRemove();
          }}
          hitSlop={10}
          style={styles.removeBtn}
        >
          <Ionicons name="trash-outline" size={16} color={theme.palette.red.fg} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  helper: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  nameRow: {
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  secondaryBtn: {
    borderWidth: 1.5,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  msg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  msgText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
