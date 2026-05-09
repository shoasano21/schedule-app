import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../constants/colors';

let QRCode: any = null;
try {
  // react-native-qrcode-svg は SSR 不可なので Web/native で動的読み込み
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

interface Props {
  visible: boolean;
  payload: string | null;
  name: string;
  eventCount: number;
  tooLarge: boolean;
  theme: Theme;
  onClose: () => void;
}

export function QRShareModal({
  visible,
  payload,
  name,
  eventCount,
  tooLarge,
  theme,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const qrSize = 280;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: theme.bgElevated }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>QR コードで共有</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.textTertiary} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            相手の Cadence でこの QR をスキャンしてください
          </Text>

          <View
            style={[
              styles.qrFrame,
              {
                backgroundColor: '#fff',
                borderColor: theme.separator,
              },
            ]}
          >
            {payload && QRCode && Platform.OS !== 'web' ? (
              <QRCode value={payload} size={qrSize} ecl="L" />
            ) : payload ? (
              <WebQRFallback value={payload} size={qrSize} />
            ) : (
              <Text style={{ color: '#000', padding: 40 }}>共有データを準備中...</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="person-circle-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.text }]}>{name}</Text>
            <Text style={[styles.metaSep, { color: theme.textTertiary }]}>・</Text>
            <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.text }]}>{eventCount} 件</Text>
          </View>

          {tooLarge ? (
            <View style={[styles.warning, { backgroundColor: theme.palette.orange.bg }]}>
              <Ionicons name="warning-outline" size={14} color={theme.palette.orange.fg} />
              <Text style={[styles.warningText, { color: theme.palette.orange.fg }]}>
                データが大きいため QR が読み取りづらい場合があります
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// Web 用 fallback (api.qrserver.com 経由で <img> 表示)
function WebQRFallback({ value, size }: { value: string; size: number }) {
  if (typeof window === 'undefined') return null;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&ecc=L`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Img: any = 'img';
  return <Img src={url} width={size} height={size} alt="QR" style={{ display: 'block' }} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
  qrFrame: {
    alignSelf: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaSep: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
