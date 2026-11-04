import { Alert, Button, Layout, Typography } from 'antd';
import { useCrypto } from '../../context/cryptoContext';
import PortfolioChart from './PortfolioChart';
import AssetsTable from './AssetsTable';
export default function AppContent() {
  const { assets, error, reload } = useCrypto();
  return <Layout.Content style={{ textAlign: 'center', minHeight: 'calc(100vh - 60px)', backgroundColor: '#001529', padding: '1rem' }}>
    {error && <Alert type="error" showIcon message="Could not load or save purchases" description={error} action={<Button onClick={reload}>Retry</Button>} />}
    <Typography.Title level={3} style={{ textAlign: 'left', color: '#fff' }}>
      Portfolio: {assets.reduce((sum, asset) => sum + asset.totalAmount, 0).toFixed(2)} USD
    </Typography.Title>
    <PortfolioChart /><AssetsTable />
  </Layout.Content>;
}
