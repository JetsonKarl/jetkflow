// Supabase 客户端。url/anonKey 未填写时 cloud 为 null，应用自动退化为纯本地模式。
import { createClient } from '@supabase/supabase-js'
import config from './cloud-config.js'

export const cloudReady = Boolean(
  config.url && config.anonKey && /^https?:\/\//.test(config.url)
)

export const cloud = cloudReady
  ? createClient(config.url, config.anonKey, { auth: { storageKey: 'jetkflow-auth' } })
  : null
