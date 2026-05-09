import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoEditorSheet } from '../../components/MemoEditorSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useMemos } from '../../hooks/useMemos';
import { useTheme } from '../../hooks/useTheme';
import type { Memo, MemoAttachment } from '../../types/Memo';

export default function MemoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { memos, createMemo, updateMemo, removeMemo } = useMemos();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const editing = editingId ? memos.find((m) => m.id === editingId) ?? null : null;

  const handleAdd = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const m = createMemo();
    setEditingId(m.id);
    setEditorOpen(true);
  }, [createMemo]);

  const handleOpen = useCallback((id: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setEditingId(id);
    setEditorOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    // Auto-cleanup: if memo is empty (no title, body, attachments), delete it
    const target = editingId ? memos.find((m) => m.id === editingId) : null;
    if (target && !target.title.trim() && !target.body.trim() && target.attachments.length === 0) {
      removeMemo(target.id);
    }
    setEditorOpen(false);
    setEditingId(null);
  }, [editingId, memos, removeMemo]);

  const handleChange = useCallback(
    (patch: Partial<Omit<Memo, 'id' | 'createdAt'>>) => {
      if (!editingId) return;
      updateMemo(editingId, patch);
    },
    [editingId, updateMemo]
  );

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    removeMemo(editingId);
    setEditorOpen(false);
    setEditingId(null);
  }, [editingId, removeMemo]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScreenHeader title="メモ" theme={theme} onAdd={handleAdd} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {memos.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Ionicons name="document-text-outline" size={36} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              まだメモがありません
            </Text>
            <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
              右上の + から URL・画像・PDF を保存できます
            </Text>
          </View>
        ) : (
          memos.map((m) => (
            <MemoCard key={m.id} memo={m} theme={theme} onPress={() => handleOpen(m.id)} />
          ))
        )}
      </ScrollView>

      <MemoEditorSheet
        visible={editorOpen}
        theme={theme}
        memo={editing}
        onClose={handleClose}
        onChange={handleChange}
        onDelete={handleDelete}
      />
    </View>
  );
}

function MemoCard({ memo, theme, onPress }: { memo: Memo; theme: any; onPress: () => void }) {
  const title = memo.title.trim() || '無題のメモ';
  const snippet = memo.body.trim().slice(0, 120);
  const counts = countAttachments(memo.attachments);
  const firstImage = memo.attachments.find((a) => a.kind === 'image');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.bgSecondary,
          borderColor: theme.separator,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.uri }} style={styles.cardImage} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.cardTitle,
            { color: memo.title.trim() ? theme.text : theme.textTertiary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {snippet ? (
          <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={2}>
            {snippet}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
            {formatDate(memo.updatedAt)}
          </Text>
          {counts.total > 0 ? (
            <View style={styles.cardChips}>
              {counts.url > 0 ? <ChipDot icon="link" count={counts.url} theme={theme} /> : null}
              {counts.image > 0 ? <ChipDot icon="image" count={counts.image} theme={theme} /> : null}
              {counts.pdf > 0 ? (
                <ChipDot icon="document-text" count={counts.pdf} theme={theme} />
              ) : null}
              {counts.file > 0 ? (
                <ChipDot icon="document" count={counts.file} theme={theme} />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ChipDot({ icon, count, theme }: { icon: any; count: number; theme: any }) {
  return (
    <View style={[styles.chipDot, { backgroundColor: theme.accentBg }]}>
      <Ionicons name={icon} size={11} color={theme.accent} />
      <Text style={[styles.chipDotText, { color: theme.accent }]}>{count}</Text>
    </View>
  );
}

function countAttachments(list: MemoAttachment[]) {
  const c = { url: 0, image: 0, pdf: 0, file: 0, total: list.length };
  for (const a of list) c[a.kind] += 1;
  return c;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const same =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (same) return `今日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardChips: {
    flexDirection: 'row',
    gap: 4,
  },
  chipDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipDotText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
