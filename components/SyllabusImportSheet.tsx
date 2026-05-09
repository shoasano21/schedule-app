import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import { SUBJECT_COLORS } from '../constants/taskTypes';
import type { Subject } from '../types/Task';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onImport: (subjects: Omit<Subject, 'id'>[]) => void;
}

interface ParsedRow {
  day: number; // 0-6 (月=0 ... 日=6) のインデックス
  period: number;
  name: string;
  color: string;
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

const PLACEHOLDER = `曜日,時限,科目名
月,1,英語Ⅰ
月,2,数学Ⅰ
火,3,化学
火,4,物理
水,1,プログラミング
木,5,体育
金,2,文学`;

export function SyllabusImportSheet({ visible, theme, onClose, onImport }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft('');
      setError(null);
    }
  }, [visible]);

  const rows: ParsedRow[] = useMemo(() => {
    if (!draft.trim()) return [];
    const out: ParsedRow[] = [];
    const lines = draft.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // 1行目がヘッダーっぽい場合スキップ
      if (i === 0 && /曜日|day|period|時限|name|科目/i.test(line)) continue;
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      if (parts.length < 3) continue;
      const [dayStr, periodStr, ...rest] = parts;
      const dayIdx = parseDay(dayStr);
      const period = parseInt(periodStr, 10);
      const name = rest.join(',').trim();
      if (dayIdx < 0 || isNaN(period) || period < 1 || !name) continue;
      out.push({
        day: dayIdx,
        period,
        name: name.slice(0, 24),
        color: SUBJECT_COLORS[(dayIdx * 3 + period) % SUBJECT_COLORS.length],
      });
    }
    return out;
  }, [draft]);

  const handleImport = () => {
    if (rows.length === 0) {
      setError('読み込めるデータがありません');
      return;
    }
    const subjects: Omit<Subject, 'id'>[] = rows.map((r) => ({
      day: r.day,
      period: r.period,
      name: r.name,
      color: r.color,
    }));
    onImport(subjects);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handlePasteSample = () => {
    setDraft(PLACEHOLDER);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>時間割インポート</Text>
          <Pressable onPress={handleImport} hitSlop={10} disabled={rows.length === 0}>
            <Text
              style={[
                styles.headerBtn,
                styles.primary,
                { color: rows.length === 0 ? theme.textTertiary : theme.accent },
              ]}
            >
              追加
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.helper, { color: theme.textTertiary }]}>
            CSV / TSV 形式で「曜日,時限,科目名」を 1 行ずつ。Excel/Numbers から
            コピー&ペーストできます。1 行目のヘッダーは自動的に無視。
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handlePasteSample}
              style={[
                styles.smallBtn,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <Ionicons name="document-text-outline" size={14} color={theme.text} />
              <Text style={[styles.smallBtnText, { color: theme.text }]}>サンプル</Text>
            </Pressable>
            <Pressable
              onPress={() => setDraft('')}
              style={[
                styles.smallBtn,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <Ionicons name="close-circle-outline" size={14} color={theme.text} />
              <Text style={[styles.smallBtnText, { color: theme.text }]}>クリア</Text>
            </Pressable>
          </View>

          <TextInput
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              setError(null);
            }}
            multiline
            scrollEnabled
            placeholder={PLACEHOLDER}
            placeholderTextColor={theme.textTertiary}
            style={[
              styles.input,
              { backgroundColor: theme.bgSecondary, color: theme.text },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <View
            style={[
              styles.summary,
              { backgroundColor: theme.accentBg },
            ]}
          >
            <Ionicons name="layers-outline" size={16} color={theme.accent} />
            <Text style={[styles.summaryText, { color: theme.accent }]}>
              プレビュー: {rows.length} 件
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorRow, { backgroundColor: theme.palette.red.bg }]}>
              <Ionicons name="alert-circle" size={16} color={theme.palette.red.fg} />
              <Text style={[styles.errorText, { color: theme.palette.red.fg }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {rows.map((r, i) => (
            <View
              key={i}
              style={[
                styles.previewRow,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <View style={[styles.previewDot, { backgroundColor: r.color }]} />
              <Text style={[styles.previewDay, { color: theme.text }]}>
                {DAY_LABELS[r.day]} {r.period}限
              </Text>
              <Text
                style={[styles.previewName, { color: theme.text }]}
                numberOfLines={1}
              >
                {r.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function parseDay(s: string): number {
  const t = s.trim();
  // 月,火,水...
  const wd = ['月', '火', '水', '木', '金', '土', '日'];
  const idx = wd.indexOf(t);
  if (idx >= 0) return idx;
  // Mon, Tue ...
  const en: Record<string, number> = {
    mon: 0, monday: 0,
    tue: 1, tuesday: 1,
    wed: 2, wednesday: 2,
    thu: 3, thursday: 3,
    fri: 4, friday: 4,
    sat: 5, saturday: 5,
    sun: 6, sunday: 6,
  };
  const enIdx = en[t.toLowerCase()];
  return enIdx ?? -1;
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
    minWidth: 70,
  },
  primary: {
    textAlign: 'right',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  helper: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 140,
    maxHeight: 220,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewDay: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 56,
  },
  previewName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
