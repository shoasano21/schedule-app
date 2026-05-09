import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../constants/colors';

interface Props {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onScanned: (text: string) => void;
}

export function QRScanModal({ visible, theme, onClose, onScanned }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [draft, setDraft] = useState('');
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      setManualMode(false);
      setDraft('');
    }
  }, [visible]);

  const handleScan = (data: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScanned(data);
  };

  const handleManualSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    handleScan(trimmed);
  };

  // expo-camera の Web 対応は限定的なので明示的にネイティブのみ
  const cameraSupported = Platform.OS !== 'web';
  const granted = permission?.granted;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>QR をスキャン</Text>
          <Pressable
            onPress={() => setManualMode((v) => !v)}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name={manualMode ? 'qr-code-outline' : 'create-outline'} size={22} color="#fff" />
          </Pressable>
        </View>

        {manualMode ? (
          <View style={styles.manualWrap}>
            <Text style={styles.manualLabel}>共有データを直接入力</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="共有コード..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.manualInput}
            />
            <Pressable
              onPress={handleManualSubmit}
              disabled={!draft.trim()}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: !draft.trim() ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.submitText}>取り込む</Text>
            </Pressable>
          </View>
        ) : !cameraSupported ? (
          <View style={styles.fallbackWrap}>
            <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.6)" />
            <Text style={styles.fallbackTitle}>カメラを使えない環境です</Text>
            <Text style={styles.fallbackSub}>右上のペンアイコンから手入力できます</Text>
          </View>
        ) : !granted ? (
          <View style={styles.fallbackWrap}>
            <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.6)" />
            <Text style={styles.fallbackTitle}>カメラへのアクセスが必要です</Text>
            <Pressable
              onPress={() => requestPermission?.()}
              style={({ pressed }) => [
                styles.permissionBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.submitText}>許可する</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(r: { data: string }) => handleScan(r.data)}
            />
            <View pointerEvents="none" style={styles.frameWrap}>
              <View style={styles.frame} />
              <Text style={styles.hint}>QR コードをフレーム内に収めてください</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  hint: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  fallbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  manualWrap: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  manualLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  manualInput: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    minHeight: 200,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
