import { useState } from 'react';
import { Button, Modal, Popconfirm, Space, Table } from 'antd';
import { useCrypto } from '../../context/cryptoContext';
import AddAssetForm from './AddAssetForm';
export default function AssetsTable() {
  const { assets, removeAsset } = useCrypto();
  const [editing, setEditing] = useState(null);
  const columns = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Purchase price, $', dataIndex: 'price', sorter: (a, b) => a.price - b.price },
    { title: 'Amount', dataIndex: 'amount', sorter: (a, b) => a.amount - b.amount },
    { title: 'Purchased', dataIndex: 'purchased_at', render: value => new Date(value).toLocaleString() },
    { title: 'Actions', render: (_, row) => <Space>
      <Button onClick={() => setEditing(row)}>Edit</Button>
      <Popconfirm title="Delete this purchase?" onConfirm={() => removeAsset(row.id)} okText="Delete" cancelText="Cancel">
        <Button danger>Delete</Button>
      </Popconfirm>
    </Space> },
  ];
  return <><Table rowKey="id" pagination={false} columns={columns} dataSource={assets} />
    <Modal title="Edit purchase" open={!!editing} footer={null} onCancel={() => setEditing(null)} destroyOnClose>
      {editing && <AddAssetForm asset={editing} onClose={() => setEditing(null)} />}
    </Modal></>;
}
