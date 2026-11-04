import { useState } from 'react';
import { Alert, Button, DatePicker, Form, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { useCrypto } from '../../context/cryptoContext';

export default function AddAssetForm({ onClose, asset }) {
  const { crypto, addAsset, editAsset, error } = useCrypto();
  const [saving, setSaving] = useState(false);
  async function save(values) {
    setSaving(true);
    const payload = { coin_id: values.coin_id, amount: values.amount.toFixed(8), price: values.price.toFixed(8), purchased_at: values.purchased_at.toDate().toISOString() };
    const ok = asset ? await editAsset(asset.id, payload) : await addAsset(payload);
    setSaving(false);
    if (ok) onClose();
  }
  return <Form layout="vertical" onFinish={save} initialValues={asset ? {
    coin_id: asset.coin_id, amount: asset.amount, price: asset.price, purchased_at: dayjs(asset.purchased_at)
  } : { purchased_at: dayjs() }}>
    {error && <Alert type="error" showIcon message="Could not save purchase" description={error} />}
    <Form.Item label="Coin" name="coin_id" rules={[{ required: true, message: 'Choose a coin' }]}>
      <Select showSearch optionFilterProp="label" options={crypto.map(c => ({ value: c.id, label: c.name }))} />
    </Form.Item>
    <Form.Item label="Amount" name="amount" rules={[{ required: true, type: 'number', min: 0.00000001, message: 'Enter an amount greater than zero' }]}>
      <InputNumber min={0.00000001} precision={8} style={{ width: '100%' }} />
    </Form.Item>
    <Form.Item label="Purchase price, USD" name="price" rules={[{ required: true, type: 'number', min: 0.00000001, message: 'Enter a price greater than zero' }]}>
      <InputNumber min={0.00000001} precision={8} style={{ width: '100%' }} />
    </Form.Item>
    <Form.Item label="Purchase date and time" name="purchased_at" rules={[{ required: true, message: 'Choose a date and time' }]}>
      <DatePicker showTime />
    </Form.Item>
    <Button type="primary" htmlType="submit" loading={saving}>{asset ? 'Save changes' : 'Add purchase'}</Button>
  </Form>;
}
