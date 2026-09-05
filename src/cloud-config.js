// Supabase 云同步配置。
// 把 Supabase 控制台 Project Settings → API 里的两个值填到下面：
//   url      —— Project URL，形如 https://abcd1234.supabase.co
//   anonKey  —— Project API keys 里的 anon public（很长的一串）
// 两项都填好后，应用启动时会显示登录界面，数据自动云端同步。
// anon key 设计上就是公开的，安全性由数据库行级权限（RLS）保证。
export default {
  url: 'https://gidwiuqwwedrhqkeumxu.supabase.co',
  anonKey: 'sb_publishable_VRzpyUaqrgDxS6g9KTUJUA_NLjeOydB',
}
