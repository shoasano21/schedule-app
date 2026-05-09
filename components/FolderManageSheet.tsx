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
import type { MemoFolder } from '../types/Memo';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  folders: MemoFolder[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderManageSheet({
  visible,
  theme,
  folders,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setEditingId(null);
      setEditingName('');
    }
  }, [visible]);

  const handleCreate = () => {
    const t = draft.trim();
    if (!t) return;
    onCreate(t);
    setDraft('');
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const startEdit = (f: MemoFolder) => {
    setEditingId(f.id);
    setEditingName(f.name);
  };

  const commitEdit = () => {
    if (!editingId) return;
    onRename(editingId, editingName);
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (f: MemoFolder) => {
    const confirmDelete = () => {
      onDelete(f.id);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(`「${f.name}」を削除しますか？\n中のメモは「未分類」に戻ります`);
      if (ok) confirmDelete();
      return;
    }
    Alert.alert(
      'フォルダを削除',
      `「${f.name}」を削除しますか？\n中のメモは「未分類」に戻ります`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.7}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>完了</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>フォルダ管理</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.newRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="新しいフォルダ名..."
              placeholderTextColor={theme.textTertiary}
              maxLength={24}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              style={[
                styles.input,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
            />
            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.accent, opacity: pressed || !draft.trim() ? 0.6 : 1 },
              ]}
              disabled={!draft.trim()}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>

          {folders.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textTertiary }]}>
              フォルダはまだありません
            </Text>
          ) : (
            folders.map((f) => (
              <View
                key={f.id}
                style={[
                  styles.row,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: f.color }]} />
                {editingId === f.id ? (
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    onSubmitEditing={commitEdit}
                    onBlur={commitEdit}
                    autoFocus
                    maxLength={24}
                    style={[styles.rowInput, { color: theme.text }]}
                  />
                ) : (
                  <Pressable onPress={() => startEdit(f)} style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.text }]}>{f.name}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => startEdit(f)} hitSlop={10} style={styles.actionIcon}>
                  <Ionicons name="pencil" size={16} color={theme.textTertiary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(f)} hitSlop={10} style={styles.actionIcon}>
                  <Ionicons name="trash-outline" size={16} color={theme.palette.red.fg} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  newRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  actionIcon: {
    paddingHorizontal: 4,
  },
  empty: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 24,
  },
});
