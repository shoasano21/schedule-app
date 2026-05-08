import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import type { Memo, MemoAttachment } from '../types/Memo';
import {
  deleteAttachmentFile,
  makeUrlAttachment,
  openAttachment,
  pickDocumentAttachment,
  pickImageAttachment,
} from '../utils/attachments';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  memo: Memo | null;
  onClose: () => void;
  onChange: (patch: Partial<Omit<Memo, 'id' | 'createdAt'>>) => void;
  onDelete: () => void;
}

export function MemoEditorSheet({ visible, theme, memo, onClose, onChange, onDelete }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !memo) return;
    setTitle(memo.title);
    setBody(memo.body);
    setUrlDraft('');
    setShowUrlInput(false);
  }, [visible, memo?.id]);

  if (!memo) return null;

  const commitTitle = (value: string) => {
    setTitle(value);
    onChange({ title: value });
  };
  const commitBody = (value: string) => {
    setBody(value);
    onChange({ body: value });
  };

  const addAttachment = (att: MemoAttachment) => {
    onChange({ attachments: [...memo.attachments, att] });
  };

  const handleAddUrl = () => {
    const att = makeUrlAttachment(urlDraft);
    if (!att) return;
    addAttachment(att);
    setUrlDraft('');
    setShowUrlInput(false);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddImage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const att = await pickImageAttachment();
      if (att) {
        addAttachment(att);
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddPdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const att = await pickDocumentAttachment('pdf');
      if (att) {
        addAttachment(att);
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddFile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const att = await pickDocumentAttachment('any');
      if (att) {
        addAttachment(att);
        if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAttachment = (att: MemoAttachment) => {
    const next = memo.attachments.filter((a) => a.id !== att.id);
    onChange({ attachments: next });
    void deleteAttachmentFile(att);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('このメモを削除しますか？');
      if (ok) onDelete();
      return;
    }
    Alert.alert('メモを削除', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.95}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>完了</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.textTertiary }]}>
            {formatRelative(memo.updatedAt)}
          </Text>
          <Pressable onPress={handleDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={theme.palette.red.fg} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            value={title}
            onChangeText={commitTitle}
            placeholder="タイトル"
            placeholderTextColor={theme.textTertiary}
            maxLength={80}
            style={[styles.titleInput, { color: theme.text }]}
          />

          <TextInput
            value={body}
            onChangeText={commitBody}
            placeholder="メモを入力..."
            placeholderTextColor={theme.textTertiary}
            multiline
            style={[styles.bodyInput, { color: theme.text }]}
            textAlignVertical="top"
          />

          <View style={[styles.divider, { backgroundColor: theme.separator }]} />

          <View style={styles.attachHeader}>
            <Text style={[styles.attachLabel, { color: theme.textTertiary }]}>
              📎 添付 ({memo.attachments.length})
            </Text>
          </View>

          <View style={styles.attachList}>
            {memo.attachments.map((att) => (
              <AttachmentRow
                key={att.id}
                att={att}
                theme={theme}
                onPress={() => openAttachment(att)}
                onRemove={() => handleRemoveAttachment(att)}
              />
            ))}
            {memo.attachments.length === 0 ? (
              <Text style={[styles.emptyAttach, { color: theme.textTertiary }]}>
                URL・画像・PDF を追加できます
              </Text>
            ) : null}
          </View>

          {showUrlInput ? (
            <View style={styles.urlRow}>
              <TextInput
                value={urlDraft}
                onChangeText={setUrlDraft}
                placeholder="https://..."
                placeholderTextColor={theme.textTertiary}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onSubmitEditing={handleAddUrl}
                style={[
                  styles.urlInput,
                  { backgroundColor: theme.bgSecondary, color: theme.text },
                ]}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleAddUrl}
                style={({ pressed }) => [
                  styles.urlBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.urlBtnText}>追加</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowUrlInput(false);
                  setUrlDraft('');
                }}
                hitSlop={10}
                style={{ paddingHorizontal: 6 }}
              >
                <Ionicons name="close" size={18} color={theme.textTertiary} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <ActionBtn
              icon="link-outline"
              label="URL"
              theme={theme}
              onPress={() => setShowUrlInput(true)}
            />
            <ActionBtn
              icon="image-outline"
              label="画像"
              theme={theme}
              onPress={handleAddImage}
              disabled={busy}
            />
            <ActionBtn
              icon="document-outline"
              label="PDF"
              theme={theme}
              onPress={handleAddPdf}
              disabled={busy}
            />
            <ActionBtn
              icon="folder-outline"
              label="その他"
              theme={theme}
              onPress={handleAddFile}
              disabled={busy}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function ActionBtn({
  icon,
  label,
  theme,
  onPress,
  disabled,
}: {
  icon: any;
  label: string;
  theme: Theme;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: theme.bgSecondary,
          borderColor: theme.separator,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.accent} />
      <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function AttachmentRow({
  att,
  theme,
  onPress,
  onRemove,
}: {
  att: MemoAttachment;
  theme: Theme;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={[
        styles.attRow,
        { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
      ]}
    >
      <Pressable onPress={onPress} style={styles.attMain}>
        {att.kind === 'image' ? (
          <Image source={{ uri: att.uri }} style={styles.attThumb} />
        ) : (
          <View
            style={[
              styles.attIcon,
              {
                backgroundColor:
                  att.kind === 'url'
                    ? theme.palette.blue.bg
                    : att.kind === 'pdf'
                    ? theme.palette.red.bg
                    : theme.palette.gray.bg,
              },
            ]}
          >
            <Ionicons
              name={
                att.kind === 'url'
                  ? 'link'
                  : att.kind === 'pdf'
                  ? 'document-text'
                  : 'document'
              }
              size={18}
              color={
                att.kind === 'url'
                  ? theme.palette.blue.fg
                  : att.kind === 'pdf'
                  ? theme.palette.red.fg
                  : theme.palette.gray.fg
              }
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.attName, { color: theme.text }]} numberOfLines={1}>
            {att.name}
          </Text>
          <Text style={[styles.attKind, { color: theme.textTertiary }]} numberOfLines={1}>
            {att.kind === 'url'
              ? att.uri
              : att.kind === 'pdf'
              ? 'PDF'
              : att.kind === 'image'
              ? '画像'
              : 'ファイル'}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10} style={styles.attRemove}>
        <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
      </Pressable>
    </View>
  );
}

function formatRelative(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (sameDay) return `今日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  headerBtn: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 8,
    letterSpacing: -0.3,
  },
  bodyInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  attachList: {
    gap: 8,
    marginBottom: 12,
  },
  emptyAttach: {
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 8,
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  attMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  attKind: {
    fontSize: 11,
    fontWeight: '500',
  },
  attRemove: {
    paddingLeft: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  urlInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  urlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  urlBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
