import React, { createContext, useContext } from 'react';
import { useIAP, type UseIAPResult } from './useIAP';

const Context = createContext<UseIAPResult | null>(null);

/**
 * アプリ全体で IAP 状態 (isPro / 製品情報 / 購入関数) を共有するためのプロバイダ。
 * useIAP は初期化で react-native-iap への接続を 1 度行うため、
 * Provider で 1 度だけ呼び出して全コンポーネントが同じインスタンスを参照する。
 */
export function IAPProvider({ children }: { children: React.ReactNode }) {
  const iap = useIAP();
  // 全機能を無料開放: isPro を強制的に true にする
  const value: UseIAPResult = { ...iap, isPro: true };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useIAPContext(): UseIAPResult {
  const ctx = useContext(Context);
  if (!ctx) {
    // Provider 外で使われた場合は SSR 等を考慮してデフォルト値を返す
    return {
      isPro: false,
      hydrated: false,
      product: null,
      busy: false,
      error: null,
      purchase: async () => false,
      restore: async () => false,
    };
  }
  return ctx;
}
