// 一次性验证脚本：用固定凭据走完整的登录/自动注册链路（与前端 submit 相同逻辑）
import { createClient } from '@supabase/supabase-js'
import config from '../src/cloud-config.js'

const ALLOWED_EMAIL = 'zjyeoe@njust.edu.cn'
const ALLOWED_PASSWORD = '19971011'

const cloud = createClient(config.url, config.anonKey)
let { data, error } = await cloud.auth.signInWithPassword({ email: ALLOWED_EMAIL, password: ALLOWED_PASSWORD })
if (error) {
  console.log('signIn 失败:', error.message)
  console.log('尝试用固定凭据自动注册...')
  const reg = await cloud.auth.signUp({ email: ALLOWED_EMAIL, password: ALLOWED_PASSWORD })
  if (reg.error) {
    console.log('signUp 失败:', reg.error.message)
    process.exit(1)
  }
  data = reg.data
}
console.log('会话用户:', data.session?.user?.email ?? data.user?.email ?? '无')
if (data.session) {
  const { data: rows, error: rl } = await cloud.from('reminders').select('id,title')
  console.log('RLS 数据读取:', rl ? `错误 ${rl.message}` : `正常，${rows.length} 行`)
  await cloud.auth.signOut()
}
