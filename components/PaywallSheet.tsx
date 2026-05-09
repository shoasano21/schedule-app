import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import type { ProductInfo } from '../hooks/useIAP';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  isPro: boolean;
  product: ProductInfo | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPurchase: () => void;
  onRestore: () => void;
}

interface Feature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'stats-chart',
    title: '記録ダッシュボード',
    desc: '勉強時間・課題完了率・カテゴリ別の学習統計を可視化',
  },
  {
    icon: 'color-palette',
    title: 'カスタムテーマ',
    desc: 'アクセントカラーを好みに変更',
  },
  {
    icon: 'cloud-upload',
    title: 'iCloud 同期 (近日)',
    desc: '複数の iPhone / iPad でデータを共有',
  },
  {
    icon: 'download',
    title: 'カレンダー書き出し (近日)',
    desc: '.ics 形式で iOS カレンダーや Google カレンダーに連携',
  },
  {
    icon: 'apps',
    title: '大きなウィジェット (近日)',
    desc: 'ホーム画面で 1 週間分の予定を一望',
  },
];

export function PaywallSheet({
  visible,
  theme,
  isPro,
  product,
  busy,
  error,
  onClose,
  onPurchase,
  onRestore,
}: Props) {
  const handlePurchase = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPurchase();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
      <View style={styles.headerRow}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.headerCloseBtn}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text style={[styles.headerBadge, { color: theme.accent }]}>PRO</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.accentBg,
              borderColor: theme.separator,
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: theme.accent }]}>
            <Ionicons name="sparkles" size={28} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Cadence Pro</Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            一度の購入で、すべての Pro 機能を永続的に利用できます
          </Text>
        </View>

        <View style={{ marginTop: 18, gap: 12 }}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                styles.featureRow,
                {
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.separator,
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: theme.accentBg }]}>
                <Ionicons name={f.icon} size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.textTertiary }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {error ? (
          <Text style={[styles.errorText, { color: theme.palette.red.fg }]}>{error}</Text>
        ) : null}

        {isPro ? (
          <View style={[styles.proBanner, { backgroundColor: theme.palette.green.bg }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.palette.green.fg} />
            <Text style={[styles.proBannerText, { color: theme.palette.green.fg }]}>
              Cadence Pro をご利用中
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handlePurchase}
            disabled={busy}
            style={({ pressed }) => [
              styles.purchaseBtn,
              {
                backgroundColor: theme.accent,
                opacity: busy ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.purchaseBtnText}>
                  Pro を購入
                </Text>
                <Text style={styles.purchaseBtnPrice}>
                  {product?.localizedPrice ?? '¥300'}
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable onPress={onRestore} disabled={busy} hitSlop={10} style={styles.restoreBtn}>
          <Text style={[styles.restoreBtnText, { color: theme.accent }]}>購入を復元</Text>
        </Pressable>

        <Text style={[styles.legal, { color: theme.textTertiary }]}>
          Cadence Pro は買い切り型です。一度購入すれば同じ Apple ID で使う全ての端末で永続的に利用できます。
          ご購入後、再インストール時は「購入を復元」をタップしてください。
        </Text>
      </ScrollView>
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
    paddingBottom: 4,
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  proBannerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 18,
  },
  purchaseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  purchaseBtnPrice: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.85,
    fontVariant: ['tabular-nums'],
  },
  restoreBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
});
