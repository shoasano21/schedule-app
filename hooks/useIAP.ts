import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Pro 機能の永続キャッシュキー
const PRO_KEY = 'schedule-app:is-pro:v1';

// App Store Connect で登録する IAP 製品 ID
export const IAP_PRODUCTS = {
  pro: 'com.shoasano.scheduleapp.pro',
} as const;

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * react-native-iap は重く Web では使えないので動的 import で守る
 */
let RNIap: typeof import('react-native-iap') | null = null;
function loadRNIap(): typeof import('react-native-iap') | null {
  if (!isMobile) return null;
  if (RNIap) return RNIap;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RNIap = require('react-native-iap');
    return RNIap;
  } catch {
    return null;
  }
}

export interface ProductInfo {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string; // "¥300"
}

export interface UseIAPResult {
  isPro: boolean;
  hydrated: boolean;
  product: ProductInfo | null;
  busy: boolean;
  error: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export function useIAP(): UseIAPResult {
  const [isPro, setIsPro] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ローカルキャッシュを読む（オフラインでも Pro 状態を保つため）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(PRO_KEY);
        if (!cancelled && v === '1') setIsPro(true);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 接続初期化 + 製品情報取得 + 既存購入の復元
  useEffect(() => {
    const iap = loadRNIap();
    if (!iap) return;

    let cancelled = false;
    (async () => {
      try {
        await iap.initConnection();
        if (cancelled) return;

        const items = await ((iap as any).fetchProducts
          ? (iap as any).fetchProducts({ skus: [IAP_PRODUCTS.pro] })
          : (iap as any).getProducts({ skus: [IAP_PRODUCTS.pro] }));
        if (cancelled) return;
        const p = items.find((x: any) => x.productId === IAP_PRODUCTS.pro);
        if (p) {
          setProduct({
            productId: p.productId,
            title: (p as any).title ?? 'Cadence Pro',
            description: (p as any).description ?? '',
            localizedPrice: (p as any).localizedPrice ?? '¥300',
          });
        }

        // 既存の購入を確認 (例えば再インストール後)
        const purchases = await iap.getAvailablePurchases();
        if (cancelled) return;
        const hasPro = purchases.some((p: any) => p.productId === IAP_PRODUCTS.pro);
        if (hasPro) {
          await AsyncStorage.setItem(PRO_KEY, '1');
          setIsPro(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          // 初期化失敗は致命的でないので silent
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        iap.endConnection();
      } catch {
        // ignore
      }
    };
  }, []);

  const purchase = useCallback(async (): Promise<boolean> => {
    const iap = loadRNIap();
    if (!iap) {
      setError('この環境では購入できません');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await iap.requestPurchase({ sku: IAP_PRODUCTS.pro } as any);
      if (result) {
        const purchase: any = Array.isArray(result) ? result[0] : result;
        if (purchase) {
          // 取引完了通知 (これを忘れると再起動時に同じ購入が再発火する)
          await iap.finishTransaction({ purchase, isConsumable: false });
        }
      }
      // 購入直後の確認 (transaction listener が無くても動くように)
      const purchases = await iap.getAvailablePurchases();
      const hasPro = purchases.some((p: any) => p.productId === IAP_PRODUCTS.pro);
      if (hasPro) {
        await AsyncStorage.setItem(PRO_KEY, '1');
        setIsPro(true);
        return true;
      }
      return false;
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'E_USER_CANCELLED') {
        // キャンセルはエラー扱いしない
        return false;
      }
      setError(e?.message ?? '購入処理でエラーが発生しました');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const iap = loadRNIap();
    if (!iap) {
      setError('この環境では復元できません');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const purchases = await iap.getAvailablePurchases();
      const hasPro = purchases.some((p: any) => p.productId === IAP_PRODUCTS.pro);
      if (hasPro) {
        await AsyncStorage.setItem(PRO_KEY, '1');
        setIsPro(true);
        return true;
      }
      setError('復元できる購入がありません');
      return false;
    } catch (e: any) {
      setError(e?.message ?? '復元処理でエラーが発生しました');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { isPro, hydrated, product, busy, error, purchase, restore };
}
