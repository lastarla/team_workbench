import { useEffect, useState, useRef } from 'react'
import { Button, Typography, Upload, List, Modal } from 'antd'
import { UploadOutlined, FileOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Requirement } from '../types'

interface Props {
  activeReq: Requirement
}

export default function Materials({ activeReq }: Props) {
  const [files, setFiles] = useState<string[]>([])

  const load = () => {
    fetch(`/api/materials/${activeReq.project}/${activeReq.name}`).then(r => r.json()).then(setFiles)
  }

  useEffect(load, [activeReq])

  const upload = async (file: File) => {
    await fetch(`/api/materials/${activeReq.project}/${activeReq.name}`, {
      method: 'POST',
      headers: { 'x-filename': file.name },
      body: file
    })
    load()
  }

  const remove = (filename: string) => {
    Modal.confirm({
      title: '删除资源',
      content: `确定删除 "${filename}"？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await fetch(`/api/materials/${activeReq.project}/${activeReq.name}/${filename}`, { method: 'DELETE' })
        load()
      }
    })
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 12 }}>资料</Typography.Text>
        <Upload showUploadList={false} beforeUpload={file => { upload(file); return false }}>
          <Button size="small" icon={<UploadOutlined />}>上传</Button>
        </Upload>
      </div>
      {files.length === 0 ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>拖拽文件到此处上传</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={files}
          renderItem={f => (
            <List.Item
              actions={[<Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(f)} />]}
              style={{ padding: '4px 0' }}
            >
              <Typography.Text style={{ fontSize: 12 }}><FileOutlined /> {f}</Typography.Text>
            </List.Item>
          )}
        />
      )}
    </div>
  )
}
