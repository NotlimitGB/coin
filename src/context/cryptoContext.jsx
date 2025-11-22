import { createContext, useEffect, useState } from "react";
import { fetchAssets, fetchCrypto } from "../api";
import { percentdiff } from "../utils";
import { useContext } from "react";

const CryptoContext = createContext({
  crypto: [],
  assets: [],
  loading: false,
});

export function CryptoContextProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [crypto, setCrypto] = useState([]);
  const [assets, setAssets] = useState([]);

  function mapAssets(asset, result) {
    return asset.map((asset) => {
      const coin = result.find((c) => c.id === asset.id);
      if (!coin)
        return {
          ...asset,
          grow: false,
          growPercent: 0,
          totalAmount: 0,
          totalProfit: 0,
        };

      return {
        grow: asset.price < coin.price,
        growPercent: percentdiff(asset.price, coin.price),
        totalAmount: asset.amount * coin.price,
        totalProfit: (coin.price - asset.price) * asset.amount,
        name: coin.name,
        ...asset,
      };
    });
  }

  useEffect(() => {
    async function preload() {
      setLoading(true);
      const { result } = await fetchCrypto();
      const assetsData = await fetchAssets();

      setAssets(mapAssets(assetsData, result));

      setCrypto(result);
      setLoading(false);
    }

    preload();
  }, []);

  function addAsset(newAsset) {
    setAssets((prev) => mapAssets([...prev, newAsset], crypto));
  }

  return (
    <CryptoContext.Provider value={{ loading, crypto, assets, addAsset }}>
      {children}
    </CryptoContext.Provider>
  );
}
export default CryptoContext;

export function useCrypto() {
  return useContext(CryptoContext);
}
