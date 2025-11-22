import {
  Flex,
  Form,
  Select,
  Space,
  Typography,
  Divider,
  InputNumber,
  Button,
  DatePicker,
  Result,
} from "antd";
import { useRef, useState } from "react";
import { useCrypto } from "../../context/cryptoContext";

export default function AddAssetForm({ onClose }) {
  const validateMessages = {
    required: "${label} is required!",
    types: {
      number: "${label} is not a valid number!",
    },
    number: {
      range: "${label} must be at least ${min}",
    },
  };
  const [form] = Form.useForm();
  const { crypto, addAsset } = useCrypto();
  const [coin, setCoin] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const assetRef = useRef(null);

  if (submitted) {
    return (
      <Result
        status="success"
        title="New Asset Added Successfully!"
        subTitle={`Added ${assetRef.current.amount} of ${coin.name} by price ${assetRef.current.price}$.`}
        extra={[
          <Button type="primary" key="console" onClick={onClose}>
            close
          </Button>,
        ]}
      />
    );
  }

  const onFinish = (values) => {
    const newAsset = {
      id: coin.id,
      amount: values.amount,
      price: values.price,
      date: values.dateTime?.$d ?? new Date(),
    };
    assetRef.current = newAsset;
    setSubmitted(true);
    addAsset(newAsset);
  };
  function hendleAmountChange(value) {
    const price = form.getFieldValue("price");
    form.setFieldsValue({
      total: +(value * price).toFixed(2),
    });
  }
  function hendlePriceChange(value) {
    const amount = form.getFieldValue("amount");
    form.setFieldsValue({
      total: +(value * amount).toFixed(2),
    });
  }
  if (!coin) {
    return (
      <Select
        onSelect={(v) => setCoin(crypto.find((c) => c.id === v))}
        placeholder="Select a coin"
        style={{ width: "100%" }}
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
    );
  }
  return (
    <Form
      form={form}
      action=""
      name="basic"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 10 }}
      style={{ maxWidth: 600 }}
      onFinish={onFinish}
      validateMessages={validateMessages}
      initialValues={{
        price: +coin.price.toFixed(2),
      }}
    >
      <Flex align="center">
        <img
          src={coin.icon}
          alt={coin.name}
          style={{ width: 40, marginRight: "10px" }}
        />
        <Typography.Title level={2} style={{ margin: 0 }}>
          {coin.name}
        </Typography.Title>
      </Flex>
      <Divider />

      <Form.Item
        label="Amount"
        name="amount"
        rules={[
          {
            required: true,
            type: "number",
            min: 0,
          },
        ]}
      >
        <InputNumber
          placeholder="Ener coin amount"
          onChange={hendleAmountChange}
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item label="Price" name="price">
        <InputNumber onChange={hendlePriceChange} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Date & time" name="dateTime">
        <DatePicker showTime></DatePicker>
      </Form.Item>
      <Form.Item label="Total" name="total">
        <InputNumber disabled style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label={null}>
        <Button type="primary" htmlType="submit">
          Add Asset
        </Button>
      </Form.Item>
    </Form>
  );
}
