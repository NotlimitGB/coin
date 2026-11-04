import { createContext, useContext, useEffect, useState } from 'react';
import { fetchAssets, fetchCrypto, createAsset, updateAsset, deleteAsset } from '../api';
import { percentdiff } from '../utils';

const CryptoContext = createContext({ crypto: [], assets: [], loading: false });
export function CryptoContextProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [crypto, setCrypto] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');
  async function reload() {
    setError('');
    try { setPurchases(await fetchAssets()); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => {
    fetchCrypto().then(({ result }) => setCrypto(result));
    fetchAssets().then(setPurchases).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);
  async function action(fn) {
    setError('');
    try { await fn(); await reload(); return true; }
    catch (err) { setError(err.message); return false; }
  }
  const assets = purchases.map(asset => {
    const coin = crypto.find(c => c.id === asset.coin_id);
    const amount = Number(asset.amount), price = Number(asset.price);
    return { ...asset, amount, price, name: coin?.name || asset.coin_id,
      grow: !!coin && price < coin.price, growPercent: coin ? percentdiff(price, coin.price) : 0,
      totalAmount: coin ? amount * coin.price : 0, totalProfit: coin ? (coin.price - price) * amount : 0 };
  });
  return <CryptoContext.Provider value={{ crypto, assets, loading, error, reload,
    addAsset: data => action(() => createAsset(data)),
    editAsset: (id, data) => action(() => updateAsset(id, data)),
    removeAsset: id => action(() => deleteAsset(id)) }}>{children}</CryptoContext.Provider>;
}
export default CryptoContext;
export const useCrypto = () => useContext(CryptoContext);
