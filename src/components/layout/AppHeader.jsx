import { Button, Layout, Select, Space, Modal, Drawer } from "antd";
import { useCrypto } from "../../context/cryptoContext";
import { useEffect, useState } from "react";
import CoinInfoModal from "./CoinInfoModal";
import AddAssetForm from "./AddAssetForm";

const headerStyle = {
  width: "100%",
  textAlign: "center",
  height: "60px",
  padding: "1 rem",
  display: "flex",
  justifyContent: "space-between",
  alignitems: "center",
};
const handleChange = (value) => {
  console.log(`selected ${value}`);
};

export default function AppHeader() {
  const [select, setSelect] = useState(false);
  const [modal, setModal] = useState(false);
  const [coin, setCoin] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { crypto } = useCrypto();

  function hendleSelect(value) {
    setModal(true);
    setCoin(crypto.find((c) => c.id === value));
  }

  useEffect(() => {
    const keypupa = (e) => {
      if (e.key === "/") {
        setSelect((prev) => !prev);
      }
    };
    document.addEventListener("keypress", keypupa);
    return () => document.removeEventListener("keypress", keypupa);
  });

  return (
    <Layout.Header style={headerStyle}>
      <Select
        open={select}
        onSelect={hendleSelect}
        onClick={() => setSelect((prev) => !prev)}
        value="press / to open"
        style={{ width: "250" }}
        optionLabelProp="label"
        options={crypto.map((coin) => ({
          label: coin.name,
          value: coin.id,
          icon: coin.icon,
        }))}
        optionRender={(option) => (
          <Space>
            <img
              style={{ width: 20 }}
              src={option.data.icon}
              alt={option.data.lable}
            />
            {option.data.label}
          </Space>
        )}
      />
      <Button type="primary" onClick={() => setDrawer(true)}>
        Add asset
      </Button>

      <Modal
        closable={{ "aria-label": "Custom Close Button" }}
        open={modal}
        onCancel={() => setModal(false)}
        footer={null}
      >
        <CoinInfoModal coin={coin}></CoinInfoModal>
      </Modal>
      <Drawer
        width={600}
        title="Basic Drawer"
        closable={{ "aria-label": "Close Button" }}
        onClose={() => setDrawer(false)}
        open={drawer}
        destroyOnClose
      >
        <AddAssetForm onClose={() => setDrawer(false)} />
      </Drawer>
    </Layout.Header>
  );
}
