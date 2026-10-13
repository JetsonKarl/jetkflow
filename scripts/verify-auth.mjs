// 一次性验证脚本：走完整的登录链路（与前端 submit 相同逻辑）。
// 密码不写死在代码里：node scripts/verify-auth.mjs <密码>
// 或先设置环境变量 JETKFLOW_PASSWORD。
import { createClient } from '@supabase/supabase-js'
import config from '../src/cloud-config.js'

const ALLOWED_EMAIL = 'zjyeoe@njust.edu.cn'
const password = process.argv[2] || process.env.JETKFLOW_PASSWORD
if (!password) {
  console.log('用法: node scripts/verify-auth.mjs <密码>')
  process.exit(1)
}

const cloud = createClient(config.url, config.anonKey)
const { data, error } = await cloud.auth.signInWithPassword({ email: ALLOWED_EMAIL, password })
if (error) {
  console.log('signIn 失败:', error.message)
  process.exit(1)
}
console.log('会话用户:', data.session?.user?.email ?? '无')
if (data.session) {
  const { data: rows, error: rl } = await cloud.from('reminders').select('id,title')
  console.log('RLS 数据读取:', rl ? `错误 ${rl.message}` : `正常，${rows.length} 行`)
  await cloud.auth.signOut()
}
