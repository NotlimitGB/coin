import { cryptoData } from './data';
export async function fetchCrypto() { return cryptoData; }
async function request(path, options) {
  const response = await fetch(`/api/assets${path}`, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load or save purchases. Try again.');
  }
  return response.status === 204 ? null : response.json();
}
export const fetchAssets = () => request('');
export const createAsset = data => request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const updateAsset = (id, data) => request(`/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteAsset = id => request(`/${id}`, { method: 'DELETE' });
