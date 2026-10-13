import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Bell, Bold, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Command, FileText, Flag, Inbox, Italic, List, ListOrdered, Menu,
  MoreHorizontal, PenLine, Pin, Plus, Search, Settings, Sparkles,
  Sun, Tag, Trash2, Type, Underline, X
} from 'lucide-react'
import './styles.css'
import { cloud, cloudReady } from './cloud.js'

const now = new Date()
const y = now.getFullYear()
const m = now.getMonth()
const pad = n => String(n).padStart(2, '0')
const iso = (day, month = m, year = y) => `${year}-${pad(month + 1)}-${pad(day)}`
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayKey = dateKey(now)
const ALLOWED_EMAIL = 'zjyeoe@njust.edu.cn'
const AUTH_DENIED_MESSAGE = '禁止注册/登录，请联系管理员。'
const normalizeEmail = value => String(value || '').trim().toLowerCase()
const isAllowedEmail = value => normalizeEmail(value) === ALLOWED_EMAIL

const seedReminders = [
  { id: 'r1', title: '准备季度复盘材料', date: todayKey, time: '10:00', list: '工作', color: '#ff9f0a', done: false, priority: true, notes: '整理关键进展与下季度目标' },
  { id: 'r2', title: '预约牙医', date: todayKey, time: '16:30', list: '个人', color: '#0a84ff', done: false, priority: false, notes: '' },
  { id: 'r3', title: '阅读 30 分钟', date: iso(now.getDate() + 1), time: '21:00', list: '成长', color: '#bf5af2', done: false, priority: false, notes: '' },
  { id: 'r4', title: '给妈妈打电话', date: iso(now.getDate() + 2), time: '19:30', list: '个人', color: '#0a84ff', done: false, priority: false, notes: '' },
  { id: 'r5', title: '更新产品路线图', date: iso(now.getDate() - 1), time: '14:00', list: '工作', color: '#ff9f0a', done: true, priority: false, notes: '' },
]

const seedEvents = [
  { id: 'e1', title: '产品周会', date: todayKey, start: '09:30', end: '10:30', calendar: '工作', color: '#ff375f', location: '会议室 A', reminderId: null },
  { id: 'e2', title: '专注创作', date: todayKey, start: '14:00', end: '16:00', calendar: '专注', color: '#5856d6', location: '', reminderId: null },
  { id: 'e3', title: '和朋友晚餐', date: iso(now.getDate() + 2), start: '18:30', end: '20:00', calendar: '生活', color: '#34c759', location: '梧桐餐厅', reminderId: null },
  { id: 'e4', title: '设计评审', date: iso(now.getDate() + 5), start: '15:00', end: '16:00', calendar: '工作', color: '#ff375f', location: '线上', reminderId: null },
  { id: 'e5', title: '新品脑暴会', date: iso(now.getDate() + 1), start: '15:00', end: '16:00', calendar: '工作', color: '#ff375f', location: '会议室 B', reminderId: null },
]

const seedNotes = [
  { id: 'n1', title: '本周思考', content: '把时间留给真正重要的事。\n\n今天完成 @准备季度复盘材料，然后梳理产品体验。', updated: '刚刚', pinned: true, folder: '便笺', color: '#f0b90b' },
  { id: 'n2', title: '产品灵感', content: '让日程、提醒与想法不再散落。\n\n@产品周会 之后整理团队反馈。', updated: '昨天', pinned: false, folder: '工作', color: '#0a84ff' },
  { id: 'n3', title: '周末清单', content: '买鲜花、整理书架、去公园走走。', updated: '周三', pinned: false, folder: '个人', color: '#34c759' },
]

const defaultLists = [
  { id: 'l1', name: '工作', color: '#ff9f0a' },
  { id: 'l2', name: '个人', color: '#0a84ff' },
  { id: 'l3', name: '成长', color: '#bf5af2' },
]

const listColors = ['#0a84ff', '#ff9f0a', '#bf5af2', '#34c759', '#ff375f', '#5e5ce6']
const calendarOptions = [
  { name:'工作', color:'#ff375f' }, { name:'生活', color:'#34c759' },
  { name:'专注', color:'#5856d6' }, { name:'个人', color:'#0a84ff' },
]

function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial } catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue]
}

// —— 云同步层 ——
// 应用内对象 <-> Supabase 行的字段映射
const cloudTables = {
  reminders: {
    table: 'reminders',
    toRow: r => ({ id: r.id, title: r.title, date: r.date || null, time: r.time || null, list: r.list, color: r.color, done: r.done, priority: r.priority, notes: r.notes || '' }),
    fromRow: row => ({ id: row.id, title: row.title, date: row.date, time: row.time, list: row.list, color: row.color, done: row.done, priority: row.priority, notes: row.notes || '' }),
  },
  events: {
    table: 'events',
    toRow: e => ({ id: e.id, title: e.title, date: e.date || null, start_time: e.start || null, end_time: e.end || null, calendar: e.calendar, color: e.color, location: e.location || '', reminder_id: e.reminderId || null }),
    fromRow: row => ({ id: row.id, title: row.title, date: row.date, start: row.start_time, end: row.end_time, calendar: row.calendar, color: row.color, location: row.location || '', reminderId: row.reminder_id }),
  },
  notes: {
    table: 'notes',
    toRow: n => ({ id: n.id, title: n.title, content: n.content || '', content_html: n.contentHtml || null, folder: n.folder || '便笺', pinned: !!n.pinned, color: n.color || '#f0b90b', updated: n.updated || '刚刚' }),
    fromRow: row => ({ id: row.id, title: row.title, content: row.content || '', contentHtml: row.content_html, folder: row.folder || '便笺', pinned: !!row.pinned, color: row.color || '#f0b90b', updated: row.updated || '刚刚' }),
  },
  lists: {
    table: 'lists',
    toRow: l => ({ id: l.id, name: l.name, color: l.color }),
    fromRow: row => ({ id: row.id, name: row.name, color: row.color }),
  },
}

const canon = obj => JSON.stringify(Object.keys(obj).sort().reduce((acc, k) => { acc[k] = obj[k]; return acc }, {}))

// 本地 localStorage 为主渲染源（离线可用、启动即显），登录后与 Supabase 双向同步。
// 首次拉取按 id 合并：云端没有而本地已有的数据（如旧数据、种子数据）会自动上传。
function useSyncedState(key, initial, config) {
  const [value, setValue] = useLocalState(key, initial)
  const sessionRef = useRef(null)
  const snapshotRef = useRef(null)
  const pushTimerRef = useRef(null)

  useEffect(() => {
    if (!cloud) return
    const pull = async () => {
      if (!sessionRef.current) return
      const { data, error } = await cloud.from(config.table).select('*').order('updated_at', { ascending: false })
      if (error) return
      const rows = data || []
      snapshotRef.current = rows
      const remoteIds = new Set(rows.map(r => r.id))
      setValue(current => [...rows.map(config.fromRow), ...current.filter(item => !remoteIds.has(item.id))])
    }
    const { data: { subscription } } = cloud.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session && isAllowedEmail(session.user?.email) ? session : null
      if (sessionRef.current) pull()
    })
    cloud.auth.getSession().then(({ data }) => {
      sessionRef.current = data.session && isAllowedEmail(data.session.user?.email) ? data.session : null
      if (sessionRef.current) pull()
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!cloud || !sessionRef.current || !snapshotRef.current) return
    clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(async () => {
      const uid = sessionRef.current?.user?.id
      if (!uid) return
      const snapshot = new Map(snapshotRef.current.map(r => [r.id, r]))
      const upserts = []
      const keepIds = new Set()
      for (const item of value) {
        keepIds.add(item.id)
        const row = { ...config.toRow(item), user_id: uid, updated_at: new Date().toISOString() }
        const prev = snapshot.get(item.id)
        if (!prev || canon(config.toRow(item)) !== canon(prev)) upserts.push(row)
      }
      const removes = [...snapshot.keys()].filter(id => !keepIds.has(id))
      if (upserts.length) await cloud.from(config.table).upsert(upserts)
      if (removes.length) await cloud.from(config.table).delete().in('id', removes)
      if (upserts.length || removes.length) {
        const { data } = await cloud.from(config.table).select('*')
        if (data) snapshotRef.current = data
      }
    }, 900)
    return () => clearTimeout(pushTimerRef.current)
  }, [value])

  return [value, setValue]
}

function formatDateLabel(key) {
  if (!key) return '无日期'
  const d = new Date(`${key}T00:00:00`)
  if (key === todayKey) return '今天'
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]}`
}

function Modal({ title, children, onClose, onSave, saveLabel = '添加' }) {
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><button onClick={onClose}>取消</button><strong>{title}</strong><button className="accent" onClick={onSave}>{saveLabel}</button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}

function ReminderEditor({ reminder, lists, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState({...reminder})
  const patch = value => setDraft(current => ({...current, ...value}))
  return <Modal title="编辑提醒事项" onClose={onClose} onSave={() => draft.title.trim() && onSave(draft)} saveLabel="完成">
    <label className="field"><span>标题</span><input autoFocus value={draft.title} onChange={e => patch({title:e.target.value})}/></label>
    <div className="field-row two"><label className="field"><span>日期</span><input type="date" value={draft.date || ''} onChange={e => patch({date:e.target.value})}/></label><label className="field"><span>时间</span><input type="time" value={draft.time || ''} onChange={e => patch({time:e.target.value})}/></label></div>
    <div className="field-row two"><label className="field"><span>列表</span><select value={draft.list} onChange={e => { const list=lists.find(l=>l.name===e.target.value); patch({list:e.target.value,color:list?.color||draft.color}) }}>{lists.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}</select></label><label className="switch-field"><span><Flag/>标记为重要</span><input type="checkbox" checked={draft.priority} onChange={e=>patch({priority:e.target.checked})}/></label></div>
    <label className="field"><span>备注</span><textarea value={draft.notes || ''} onChange={e=>patch({notes:e.target.value})} placeholder="添加备注"/></label>
    <button className="danger-button" onClick={() => onDelete(reminder.id)}><Trash2/>删除提醒事项</button>
  </Modal>
}

function EventEditor({ event, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState({...event, sync:Boolean(event.reminderId)})
  const patch = value => setDraft(current => ({...current,...value}))
  return <Modal title="编辑日程" onClose={onClose} onSave={() => draft.title.trim() && onSave(draft)} saveLabel="完成">
    <label className="field"><span>标题</span><input autoFocus value={draft.title} onChange={e=>patch({title:e.target.value})}/></label>
    <label className="field"><span>日期</span><input type="date" value={draft.date} onChange={e=>patch({date:e.target.value})}/></label>
    <div className="field-row two"><label className="field"><span>开始</span><input type="time" value={draft.start} onChange={e=>patch({start:e.target.value})}/></label><label className="field"><span>结束</span><input type="time" value={draft.end} onChange={e=>patch({end:e.target.value})}/></label></div>
    <div className="field-row two"><label className="field"><span>日历</span><select value={draft.calendar} onChange={e=>{const calendar=calendarOptions.find(c=>c.name===e.target.value);patch({calendar:e.target.value,color:calendar?.color||draft.color})}}>{calendarOptions.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select></label><label className="field"><span>地点</span><input value={draft.location||''} onChange={e=>patch({location:e.target.value})} placeholder="可选"/></label></div>
    <label className="switch-row"><span><Bell/><b>同步到提醒事项</b><small>日程变化时同步更新提醒</small></span><input type="checkbox" checked={draft.sync} onChange={e=>patch({sync:e.target.checked})}/></label>
    <button className="danger-button" onClick={()=>onDelete(event)}><Trash2/>删除日程</button>
  </Modal>
}

function AddListModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(listColors[0])
  const save = () => name.trim() && onAdd({id:crypto.randomUUID(),name:name.trim(),color})
  return <Modal title="新建列表" onClose={onClose} onSave={save}>
    <label className="field"><span>列表名称</span><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="例如：旅行计划" onKeyDown={e=>e.key==='Enter'&&save()}/></label>
    <div className="color-picker"><span>颜色</span><div>{listColors.map(c=><button key={c} className={color===c?'selected':''} style={{background:c}} onClick={()=>setColor(c)} aria-label={`选择颜色 ${c}`}><Check/></button>)}</div></div>
  </Modal>
}

function ChangePasswordModal({ onClose }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    if (pw1.length < 8) { setError('密码至少 8 位'); return }
    if (pw1 !== pw2) { setError('两次输入的密码不一致'); return }
    setBusy(true); setError('')
    // 管理员侧改密或长期挂机会让本地会话失效，先确认会话再改密，给出可操作的提示。
    const { data: { session: live } } = await cloud.auth.getSession()
    if (!live) {
      setBusy(false)
      setError('登录状态已失效：请退出登录后用旧密码重新登录，再来修改密码')
      return
    }
    const { error: err } = await cloud.auth.updateUser({ password: pw1 })
    setBusy(false)
    if (err) {
      setError(err.message === 'Auth session missing!'
        ? '登录状态已失效：请退出登录后用旧密码重新登录，再来修改密码'
        : err.message)
      return
    }
    onClose(true)
  }
  return <Modal title="修改密码" onClose={() => onClose(false)} onSave={save} saveLabel={busy ? '保存中…' : '保存'}>
    <label className="field"><span>新密码</span><input type="password" autoFocus value={pw1} onChange={e=>setPw1(e.target.value)} placeholder="至少 8 位"/></label>
    <label className="field"><span>确认新密码</span><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()}/></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <p className="auth-allowlist">新密码只保存在 Supabase 服务器端，不会写入代码</p>
  </Modal>
}

function SettingsPanel({ settings, setSettings, notificationPermission, enableNotifications, session, onSignOut, onClose }) {
  const patch = value => setSettings(current => ({...current,...value}))
  const [showPw, setShowPw] = useState(false)
  const [pwChanged, setPwChanged] = useState(false)
  return <Modal title="JetKFlow 设置" onClose={onClose} onSave={onClose} saveLabel="完成">
    <div className="settings-group"><h3>通用</h3><label className="setting-row"><span><b>启动时打开</b><small>选择默认显示的页面</small></span><select value={settings.startPage} onChange={e=>patch({startPage:e.target.value})}><option value="home">今天概览</option><option value="reminders">提醒事项</option><option value="calendar">日历</option><option value="notes">便笺</option></select></label><label className="setting-row"><span><b>紧凑布局</b><small>在屏幕中显示更多内容</small></span><input type="checkbox" checked={settings.compact} onChange={e=>patch({compact:e.target.checked})}/></label></div>
    <div className="settings-group"><h3>云同步</h3>{session ? <>
      <div className="setting-row"><span><b>{session.user?.email || '已登录'}</b><small>提醒、日历与便笺通过 Supabase 在设备间同步</small></span><button className="setting-button" onClick={onSignOut}>退出登录</button></div>
      <div className="setting-row"><span><b>修改密码</b><small>{pwChanged ? '密码已更新，下次登录起生效' : '密码仅保存在服务器端，代码中不可见'}</small></span><button className="setting-button" onClick={()=>setShowPw(true)}>修改</button></div>
    </> : <div className="setting-row"><span><b>未登录</b><small>当前为本地模式，数据仅保存在此设备</small></span><em className="status-badge gray">本地</em></div>}</div><div className="settings-group"><h3>提醒</h3><div className="setting-row"><span><b>Windows 桌面通知</b><small>{notificationPermission==='granted'?'已允许通知':notificationPermission==='denied'?'已在系统中关闭':'到时间后显示系统提醒'}</small></span><button className="setting-button" onClick={enableNotifications}>{notificationPermission==='granted'?'已开启':'开启'}</button></div></div>
    <div className="settings-group"><h3>数据与隐私</h3><div className="setting-row"><span><b>本地数据</b><small>提醒事项、日历和便笺仅保存在此设备</small></span><em className="status-badge">已启用</em></div><div className="setting-row"><span><b>附件与上传</b><small>JetKFlow 不提供文件上传功能</small></span><em className="status-badge gray">已禁用</em></div></div>
    <p className="settings-version">JetKFlow Web · 0.2</p>
    {showPw && <ChangePasswordModal onClose={ok=>{setShowPw(false); if(ok) setPwChanged(true)}}/>}
  </Modal>
}

function QuickAdd({ mode, lists, activeList, onClose, onAddReminder, onAddEvent, onAddNote }) {
  const [type, setType] = useState(mode || 'reminder')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey)
  const [time, setTime] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [sync, setSync] = useState(true)
  const [notes, setNotes] = useState('')
  const [list, setList] = useState(activeList || lists[0]?.name || '个人')
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [type])
  const save = () => {
    if (!title.trim()) return inputRef.current?.focus()
    if (type === 'reminder') onAddReminder({ title, date, time, notes, list, color:lists.find(l=>l.name===list)?.color || '#0a84ff' })
    if (type === 'event') onAddEvent({ title, date, start: time, end, sync })
    if (type === 'note') onAddNote({ title, content: notes })
    onClose()
  }
  return <Modal title="新建" onClose={onClose} onSave={save}>
    <div className="segmented modal-tabs">
      <button className={type === 'reminder' ? 'active' : ''} onClick={() => setType('reminder')}><CheckCircle2/>提醒事项</button>
      <button className={type === 'event' ? 'active' : ''} onClick={() => setType('event')}><CalendarDays/>日程</button>
      <button className={type === 'note' ? 'active' : ''} onClick={() => setType('note')}><FileText/>便笺</button>
    </div>
    <label className="field"><span>{type === 'note' ? '标题' : '名称'}</span><input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'note' ? '新的便笺' : '添加标题'} onKeyDown={e => e.key === 'Enter' && type !== 'note' && save()} /></label>
    {type !== 'note' && <div className="field-row"><label className="field"><span>日期</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label className="field"><span>{type === 'event' ? '开始' : '时间'}</span><input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>{type === 'event' && <label className="field"><span>结束</span><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>}</div>}
    {type === 'reminder' && <label className="field"><span>列表</span><select value={list} onChange={e=>setList(e.target.value)}>{lists.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}</select></label>}
    {type === 'event' && <label className="switch-row"><span><CheckCircle2/><b>同步到提醒事项</b><small>日程开始时同时提醒</small></span><input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} /></label>}
    <label className="field"><span>{type === 'note' ? '正文' : '备注'}</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={type === 'note' ? '开始记录… 使用 @ 关联日程或提醒事项' : '可选'} /></label>
  </Modal>
}

function Home({ reminders, events, notes, navigate, toggleReminder }) {
  const todayReminders = reminders.filter(r => r.date === todayKey && !r.done)
  const todayEvents = events.filter(e => e.date === todayKey).sort((a,b) => a.start.localeCompare(b.start))
  return <main className="content home-view">
    <header className="page-heading"><div><span className="eyebrow">{new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric', weekday:'long' }).format(now)}</span><h1>早上好，Zhang</h1><p>让今天从容地发生。</p></div><div className="weather-pill"><Sun/><span><b>26°</b><small>上海 · 晴</small></span></div></header>
    <section className="today-card">
      <div className="today-top"><div><span>今日进度</span><strong>{todayReminders.length + todayEvents.length} 件事</strong></div><div className="progress-ring"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="17"/><circle className="ring-fill" cx="21" cy="21" r="17"/></svg><b>35%</b></div></div>
      <div className="timeline">
        {todayEvents.map((event, i) => <button className="timeline-item" key={event.id} onClick={() => navigate('calendar')}><span className="timeline-time">{event.start}</span><i style={{background:event.color}}/><div><b>{event.title}</b><small>{event.end} 结束 {event.location && `· ${event.location}`}</small></div></button>)}
      </div>
    </section>
    <div className="home-grid">
      <section className="panel"><div className="panel-title"><span><CheckCircle2 className="blue"/>今天的提醒</span><button onClick={() => navigate('reminders')}>查看全部 <ChevronRight/></button></div><div className="compact-list">{todayReminders.map(r => <div className="compact-row" key={r.id}><button className="check" style={{borderColor:r.color}} onClick={() => toggleReminder(r.id)} aria-label="完成提醒"><Check/></button><div><b>{r.title}</b><small>{r.time} · {r.list}</small></div>{r.priority && <Flag className="flag"/>}</div>)}</div></section>
      <section className="panel"><div className="panel-title"><span><FileText className="yellow"/>最近便笺</span><button onClick={() => navigate('notes')}>查看全部 <ChevronRight/></button></div><div className="note-peek-grid">{notes.slice(0,2).map(n => <button className="note-peek" key={n.id} style={{'--note-color':n.color||'#f0b90b'}} onClick={() => navigate('notes', n.id)}><i className="note-color-bar"/><b>{n.title}</b><p>{n.content}</p><small>{n.updated}</small></button>)}</div></section>
    </div>
  </main>
}

function Reminders({ reminders, setReminders, filter, lists, openAdd }) {
  const listName = filter.startsWith('list:') ? filter.slice(5) : null
  const filtered = reminders.filter(r => listName ? r.list === listName && !r.done : filter === 'completed' ? r.done : filter === 'today' ? r.date === todayKey && !r.done : filter === 'scheduled' ? r.date && !r.done : !r.done)
  const grouped = filtered.reduce((acc, r) => { const k = r.date || 'none'; (acc[k] ||= []).push(r); return acc }, {})
  const toggle = id => setReminders(items => items.map(r => r.id === id ? {...r, done:!r.done} : r))
  const [editing, setEditing] = useState(null)
  const title = listName || ({today:'今天', scheduled:'计划', all:'全部', completed:'已完成'})[filter]
  return <main className="content reminders-view">
    <header className="page-heading compact"><div><span className="eyebrow">提醒事项</span><h1>{title}</h1></div><button className="round-action" onClick={() => openAdd('reminder')}><Plus/>新提醒</button></header>
    <section className="reminder-surface">
      {Object.keys(grouped).length === 0 && <div className="empty-state"><CheckCircle2/><h3>都完成了</h3><p>这里暂时没有待处理的提醒事项。</p></div>}
      {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([date, items]) => <div className="reminder-group" key={date}>
        <h3>{formatDateLabel(date)}<span>{items.length}</span></h3>
        {items.map(r => <div className={`reminder-row ${r.done ? 'done' : ''}`} key={r.id} onClick={() => setEditing(r)} role="button" tabIndex="0" onKeyDown={e=>e.key==='Enter'&&setEditing(r)}>
          <button className="check large" style={{borderColor:r.color}} onClick={e => {e.stopPropagation();toggle(r.id)}} aria-label={`完成 ${r.title}`}><Check/></button>
          <div className="reminder-main"><b>{r.title}</b>{r.notes && <p>{r.notes}</p>}<small><Clock3/>{r.time || '全天'}<i/> <span style={{color:r.color}}>{r.list}</span></small></div>
          {r.priority && <Flag className="flag"/>}<button className="more edit-indicator" onClick={e => {e.stopPropagation();setEditing(r)}} title="编辑"><ChevronRight/></button>
        </div>)}
      </div>)}
      <button className="inline-add" onClick={() => openAdd('reminder')}><Plus/>新提醒事项</button>
    </section>
    {editing && <ReminderEditor reminder={editing} lists={lists} onClose={()=>setEditing(null)} onSave={updated=>{setReminders(items=>items.map(r=>r.id===updated.id?updated:r));setEditing(null)}} onDelete={id=>{setReminders(items=>items.filter(r=>r.id!==id));setEditing(null)}}/>}
  </main>
}

function CalendarView({ events, setEvents, reminders, setReminders, selectedDate, setSelectedDate, viewDate, setViewDate, openAdd }) {
  const year = viewDate.getFullYear(), month = viewDate.getMonth()
  const first = new Date(year, month, 1), last = new Date(year, month + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, i - startOffset + 1)
    days.push(d)
  }
  const selectedEvents = events.filter(e => e.date === selectedDate).sort((a,b) => a.start.localeCompare(b.start))
  const [editing, setEditing] = useState(null)
  const move = delta => setViewDate(new Date(year, month + delta, 1))
  const saveEvent = draft => {
    let reminderId = draft.reminderId
    if (draft.sync && !reminderId) reminderId = crypto.randomUUID()
    if (!draft.sync && reminderId) setReminders(items=>items.filter(r=>r.id!==reminderId))
    if (draft.sync) {
      setReminders(items => {
        const synced = {id:reminderId,title:draft.title,date:draft.date,time:draft.start,notes:'从日历同步',list:'个人',color:'#0a84ff',done:false,priority:false}
        return items.some(r=>r.id===reminderId) ? items.map(r=>r.id===reminderId?{...r,title:draft.title,date:draft.date,time:draft.start}:r) : [synced,...items]
      })
    }
    const updated = {...draft,reminderId:draft.sync?reminderId:null}
    delete updated.sync
    setEvents(items=>items.map(e=>e.id===updated.id?updated:e)); setSelectedDate(updated.date); setViewDate(new Date(`${updated.date}T00:00:00`)); setEditing(null)
  }
  const deleteEvent = event => {
    setEvents(items=>items.filter(e=>e.id!==event.id))
    if (event.reminderId) setReminders(items=>items.filter(r=>r.id!==event.reminderId))
    setEditing(null)
  }
  return <main className="content calendar-view">
    <header className="calendar-head"><div><span className="eyebrow">日历</span><h1>{year}年 {month + 1}月</h1></div><div className="calendar-controls"><button onClick={() => {setViewDate(new Date()); setSelectedDate(todayKey)}}>今天</button><div><button onClick={() => move(-1)}><ChevronLeft/></button><button onClick={() => move(1)}><ChevronRight/></button></div><button className="icon-primary" onClick={() => openAdd('event')}><Plus/></button></div></header>
    <div className="calendar-layout"><section className="month-card"><div className="weekday-row">{['周一','周二','周三','周四','周五','周六','周日'].map(d => <span key={d}>{d}</span>)}</div><div className="month-grid">{days.map(d => {
      const key = dateKey(d), dayEvents = events.filter(e => e.date === key), outside = d.getMonth() !== month
      return <button key={key} className={`day-cell ${outside?'outside':''} ${key===selectedDate?'selected':''}`} onClick={() => setSelectedDate(key)}><span className={key === todayKey ? 'today-number' : ''}>{d.getDate()}</span><div className="event-stack">{dayEvents.slice(0,3).map(ev => <i key={ev.id} style={{'--event-color':ev.color}} onClick={e=>{e.stopPropagation();setSelectedDate(key);setEditing(ev)}} title={`编辑：${ev.title}`}><b>{ev.start}</b> {ev.title}</i>)}</div></button>
    })}</div></section>
    <aside className="agenda-panel"><div className="agenda-date"><span>{new Date(`${selectedDate}T00:00:00`).getDate()}</span><div><b>{formatDateLabel(selectedDate)}</b><small>{selectedEvents.length ? `${selectedEvents.length} 个日程` : '暂无日程'}</small></div></div>{selectedEvents.map(ev => <button className="agenda-event" key={ev.id} style={{'--event-color':ev.color}} onClick={()=>setEditing(ev)}><div><b>{ev.title}</b><span>{ev.start} – {ev.end}</span>{ev.location && <small>{ev.location}</small>}</div><span className="agenda-actions">{ev.reminderId && <Bell/>}<ChevronRight/></span></button>)}{!selectedEvents.length && <div className="agenda-empty"><CalendarDays/><p>这一天还很自由</p></div>}<button className="agenda-add" onClick={() => openAdd('event')}><Plus/>添加日程</button></aside></div>
    {editing && <EventEditor event={editing} onClose={()=>setEditing(null)} onSave={saveEvent} onDelete={deleteEvent}/>} 
  </main>
}

function MentionText({ text, onNavigate }) {
  const pieces = text.split(/(@[^\s，。,.！!？?\n]+)/g)
  return <>{pieces.map((p,i) => p.startsWith('@') ? <button className="mention" key={i} onClick={() => onNavigate(p)}>{p}</button> : <React.Fragment key={i}>{p}</React.Fragment>)}</>
}

function NotesView({ notes, setNotes, selectedNote, setSelectedNote, reminders, events, openAdd, navigate }) {
  const note = notes.find(n => n.id === selectedNote) || notes[0]
  const editorRef = useRef(null)
  const saveTimerRef = useRef(null)
  const activeNoteIdRef = useRef(note?.id)
  const draftHtmlRef = useRef('')
  const draftTextRef = useRef(note?.content || '')
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [noteQuery, setNoteQuery] = useState('')
  const [draftLength, setDraftLength] = useState(note?.content.length || 0)
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false)
  const [folderFilter, setFolderFilter] = useState('全部')
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [...reminders.map(r => ({id:r.id, title:r.title, type:'提醒事项', icon:CheckCircle2})), ...events.map(e => ({id:e.id, title:e.title, type:'日历', icon:CalendarDays}))].filter(x => x.title.includes(mentionQuery)).slice(0,6)
  const update = patch => setNotes(items => items.map(n => n.id === note.id ? {...n, ...patch, updated:'刚刚'} : n))
  const visibleNotes = notes.filter(n => (n.title+n.content).toLowerCase().includes(noteQuery.toLowerCase()))
  const folders = [...new Set(['便笺', ...notes.map(n => n.folder || '便笺')])]
  const noteColors = ['#f0b90b','#0a84ff','#34c759','#ff6482','#bf5af2','#8e8e93']
  const sortedNotes = [...visibleNotes.filter(n => folderFilter==='全部' || (n.folder||'便笺')===folderFilter)].sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0))
  const togglePin = () => { update({pinned:!note.pinned}); setMenuOpen(false) }
  const setNoteColor = color => update({color})
  const moveToFolder = folder => { update({folder}); setMenuOpen(false) }
  const createFolder = () => { const name = window.prompt('新建文件夹名称'); if (name && name.trim()) moveToFolder(name.trim()) }
  const deleteNote = () => { if (!window.confirm(`删除便笺「${note.title}」？此操作不可恢复。`)) return; setNotes(items => items.filter(n => n.id !== note.id)); setMenuOpen(false); setMobileEditorOpen(false) }
  const initialHtml = current => current.contentHtml || current.content.split('\n').map(line=>`<div>${line || '<br>'}</div>`).join('')
  const mentionTargets = [
    ...reminders.map(r => ({ title: r.title, type: '提醒事项' })),
    ...events.map(e => ({ title: e.title, type: '日历' })),
  ].filter(x => x.title)
  const chipSpan = (title, type) => {
    const s = document.createElement('span')
    s.className = `mention-chip ${type === '日历' ? 'event' : 'reminder'}`
    s.contentEditable = 'false'
    s.dataset.mentionTitle = title
    s.textContent = `@${title}`
    return s
  }
  // 把正文中与提醒/日程同名的 @文本 转换成飞书风格的引用芯片（失焦或切换便笺时执行，避免打断输入光标）。
  const chipify = root => {
    if (!root || !mentionTargets.length) return
    const typeOf = new Map(mentionTargets.map(x => [x.title, x.type]))
    const pattern = new RegExp('@(' + [...typeOf.keys()].map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|') + ')(?![\\w])', 'g')
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('.mention-chip') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const node of nodes) {
      const text = node.data
      pattern.lastIndex = 0
      if (!pattern.test(text)) continue
      pattern.lastIndex = 0
      const frag = document.createDocumentFragment()
      let last = 0, m
      while ((m = pattern.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)))
        frag.appendChild(chipSpan(m[1], typeOf.get(m[1])))
        last = m.index + m[0].length
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
      node.parentNode.replaceChild(frag, node)
    }
  }
  const commitDraft = (withChips = false) => {
    clearTimeout(saveTimerRef.current)
    const id = activeNoteIdRef.current
    if (!id || !editorRef.current) return
    if (withChips) chipify(editorRef.current)
    const contentHtml = editorRef.current.innerHTML
    const content = editorRef.current.innerText
    draftHtmlRef.current = contentHtml; draftTextRef.current = content
    setNotes(items => items.map(n => n.id === id ? {...n, content, contentHtml, updated:'刚刚'} : n))
  }
  useEffect(() => {
    if (!note || !editorRef.current) return
    activeNoteIdRef.current = note.id
    const html = initialHtml(note)
    editorRef.current.innerHTML = html
    chipify(editorRef.current)
    draftHtmlRef.current = html; draftTextRef.current = note.content
    setDraftLength(note.content.length); setMentionOpen(false); setMenuOpen(false)
    return () => { clearTimeout(saveTimerRef.current) }
  }, [note?.id])
  useEffect(() => () => { clearTimeout(saveTimerRef.current) }, [])
  const mentionAtCaret = () => {
    const selection = window.getSelection()
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode) || selection.anchorNode?.nodeType !== Node.TEXT_NODE) return null
    const before = selection.anchorNode.data.slice(0, selection.anchorOffset)
    return before.match(/(?:^|\s)@([^\s@]{0,30})$/)
  }
  const updateMention = () => {
    const match = mentionAtCaret()
    setMentionOpen(Boolean(match)); setMentionQuery(match?.[1] || '')
  }
  const onContent = e => {
    const text = e.currentTarget.innerText
    draftHtmlRef.current = e.currentTarget.innerHTML; draftTextRef.current = text; setDraftLength(text.length)
    updateMention()
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(commitDraft, 450)
  }
  const format = (command, value) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    if (editorRef.current) onContent({currentTarget:editorRef.current})
  }
  const insertMention = (title, type) => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode) && selection.anchorNode?.nodeType === Node.TEXT_NODE) {
      const node = selection.anchorNode, offset = selection.anchorOffset
      const before = node.data.slice(0, offset), match = before.match(/(?:^|\s)@([^\s@]{0,30})$/)
      if (match) {
        const prefixSpace = match[0].startsWith(' ') ? ' ' : ''
        const start = offset - match[0].length
        node.deleteData(start, match[0].length)
        if (prefixSpace) node.insertData(start, prefixSpace)
        const chip = chipSpan(title, type)
        const after = document.createTextNode(' ')
        const rest = node.splitText(start + prefixSpace.length)
        node.parentNode.insertBefore(after, rest)
        node.parentNode.insertBefore(chip, after)
        const range = document.createRange(); range.setStart(after, 1); range.collapse(true)
        selection.removeAllRanges(); selection.addRange(range)
      }
    }
    onContent({currentTarget:editorRef.current}); setMentionOpen(false)
  }
  const onEditorClick = e => {
    const chip = e.target && e.target.closest ? e.target.closest('.mention-chip') : null
    if (chip) {
      const title = chip.dataset.mentionTitle
      if (reminders.some(r => r.title === title)) navigate('reminders')
      else if (events.some(x => x.title === title)) navigate('calendar')
      return
    }
    updateMention()
  }
  if (!note) return null
  return <main className="content notes-view"><header className="page-heading compact"><div><span className="eyebrow">便笺</span><h1>{folderFilter==='全部'?'所有便笺':folderFilter}</h1></div><button className="round-action yellow-action" onClick={() => openAdd('note')}><PenLine/>新便笺</button></header>
    <div className={`notes-layout ${mobileEditorOpen?'mobile-editor-open':''}`}><section className="notes-list"><div className="folder-chips">{['全部',...folders].map(f => <button key={f} className={folderFilter===f?'active':''} onClick={()=>setFolderFilter(f)}>{f}</button>)}</div><div className="notes-search"><Search/><input value={noteQuery} onChange={e=>setNoteQuery(e.target.value)} placeholder="搜索便笺" /></div><div className="note-cards">{sortedNotes.map(n => <button key={n.id} className={`note-list-item ${note.id===n.id?'active':''}`} style={{'--note-color':n.color||'#f0b90b'}} onClick={() => {commitDraft(true);setSelectedNote(n.id);setMobileEditorOpen(true)}}><i className="note-color-bar"/>{n.pinned && <Pin/>}<b>{n.title}</b><p>{n.content.replace(/\n/g,' ')}</p><small>{n.updated} · {n.folder}</small></button>)}{!sortedNotes.length && <div className="notes-empty"><FileText/><p>没有匹配的便笺</p></div>}</div></section>
    <section className="note-editor"><div className="note-color-strip" style={{background:note.color||'#f0b90b'}}/><button className="mobile-note-back" onClick={()=>{commitDraft(true);setMobileEditorOpen(false)}}><ChevronLeft/>所有便笺</button><div className="editor-toolbar"><div className="format-tools"><select aria-label="字号" defaultValue="3" onChange={e=>format('fontSize',e.target.value)}><option value="2">小号</option><option value="3">正文</option><option value="4">大号</option><option value="5">标题</option></select><button title="加粗" onMouseDown={e=>{e.preventDefault();format('bold')}}><Bold/></button><button title="斜体" onMouseDown={e=>{e.preventDefault();format('italic')}}><Italic/></button><button title="下划线" onMouseDown={e=>{e.preventDefault();format('underline')}}><Underline/></button><button title="项目符号" onMouseDown={e=>{e.preventDefault();format('insertUnorderedList')}}><List/></button><button title="编号列表" onMouseDown={e=>{e.preventDefault();format('insertOrderedList')}}><ListOrdered/></button><button title="检查清单" onMouseDown={e=>{e.preventDefault();format('insertText','☐ ')}}><CheckCircle2/></button><button title="标签" onMouseDown={e=>{e.preventDefault();format('insertText','#')}}><Tag/></button></div><div className="editor-more"><button title="更多" className={menuOpen?'active':''} onClick={()=>setMenuOpen(v=>!v)}><MoreHorizontal/></button>{menuOpen && <><button className="menu-scrim" aria-label="关闭菜单" onClick={()=>setMenuOpen(false)}/><div className="more-menu"><button onClick={togglePin}><Pin/>{note.pinned?'取消置顶':'置顶便笺'}</button><div className="more-colors"><span>便笺颜色</span><div>{noteColors.map(c => <button key={c} className={(note.color||'#f0b90b')===c?'selected':''} style={{background:c}} onClick={()=>setNoteColor(c)} aria-label={`颜色 ${c}`}><Check/></button>)}</div></div><div className="more-folders"><span>移动到文件夹</span>{folders.map(f => <button key={f} className={(note.folder||'便笺')===f?'current':''} onClick={()=>moveToFolder(f)}>{f}</button>)}<button onClick={createFolder}>＋ 新建文件夹</button></div><button className="danger" onClick={deleteNote}><Trash2/>删除便笺</button></div></>}</div></div><div className="editor-meta"><input value={note.title} onChange={e => update({title:e.target.value})}/><span>{note.updated} · {draftLength} 个字 · {note.folder||'便笺'}</span></div><div className="editor-wrap"><div key={note.id} ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning onInput={onContent} onKeyUp={updateMention} onClick={onEditorClick} onBlur={()=>{setMentionOpen(false);commitDraft(true)}} data-placeholder="开始记录…" />{mentionOpen && <div className="mention-menu"><div className="mention-title"><span>@</span>链接到</div>{links.map(item => { const Icon=item.icon; return <button key={item.type+item.id} onMouseDown={e=>{e.preventDefault();insertMention(item.title, item.type)}}><i className={item.type==='日历'?'pink-bg':'blue-bg'}><Icon/></i><span><b>{item.title}</b><small>{item.type}</small></span><Plus/></button>})}</div>}</div><div className="editor-hint"><Command/> 输入 <b>@</b> 可链接提醒事项或日历 · 内容自动保存</div></section></div>
  </main>
}

function Sidebar({ active, setActive, filter, setFilter, reminders, mobileOpen, setMobileOpen }) {
  const nav = [
    {id:'home', label:'今天概览', icon:Sparkles},
    {id:'calendar', label:'日历', icon:CalendarDays},
    {id:'notes', label:'便笺', icon:FileText},
  ]
  const smart = [
    {id:'today', label:'今天', icon:Sun, color:'#0a84ff', count:reminders.filter(r => r.date===todayKey&&!r.done).length},
    {id:'scheduled', label:'计划', icon:CalendarDays, color:'#ff375f', count:reminders.filter(r => r.date&&!r.done).length},
    {id:'all', label:'全部', icon:Inbox, color:'#8e8e93', count:reminders.filter(r => !r.done).length},
    {id:'completed', label:'已完成', icon:CheckCircle2, color:'#34c759', count:reminders.filter(r => r.done).length},
  ]
  const choose = id => { setActive(id); setMobileOpen(false) }
  return <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}><div className="traffic"><i/><i/><i/></div><div className="brand"><div className="brand-mark"><Check/></div><span>Dayflow</span></div><nav>{nav.map(item => {const Icon=item.icon;return <button className={active===item.id?'active':''} key={item.id} onClick={()=>choose(item.id)}><Icon/><span>{item.label}</span></button>})}</nav><div className="nav-section"><h4>提醒事项</h4>{smart.map(item => {const Icon=item.icon;return <button className={active==='reminders'&&filter===item.id?'active':''} key={item.id} onClick={()=>{setFilter(item.id);choose('reminders')}}><i style={{background:item.color}}><Icon/></i><span>{item.label}</span><em>{item.count}</em></button>})}</div><div className="nav-section lists"><h4>我的列表 <Plus/></h4>{lists.map(l => <button key={l.name} onClick={()=>{setFilter('all');choose('reminders')}}><i style={{background:l.color}}/><span>{l.name}</span><em>{reminders.filter(r=>r.list===l.name&&!r.done).length}</em></button>)}</div><div className="sidebar-foot"><button><Settings/><span>设置</span></button><div className="avatar">Z</div></div></aside>
}

function JetKSidebar({ active, setActive, filter, setFilter, reminders, lists, mobileOpen, setMobileOpen, openListCreator, openSettings }) {
  const nav = [
    {id:'home', label:'今天概览', icon:Sparkles},
    {id:'calendar', label:'日历', icon:CalendarDays},
    {id:'notes', label:'便笺', icon:FileText},
  ]
  const smart = [
    {id:'today', label:'今天', icon:Sun, color:'#0a84ff', count:reminders.filter(r => r.date===todayKey&&!r.done).length},
    {id:'scheduled', label:'计划', icon:CalendarDays, color:'#ff375f', count:reminders.filter(r => r.date&&!r.done).length},
    {id:'all', label:'全部', icon:Inbox, color:'#8e8e93', count:reminders.filter(r => !r.done).length},
    {id:'completed', label:'已完成', icon:CheckCircle2, color:'#34c759', count:reminders.filter(r => r.done).length},
  ]
  const choose = id => { setActive(id); setMobileOpen(false) }
  return <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
    <div className="traffic"><i/><i/><i/></div>
    <div className="brand"><div className="brand-mark"><Check/></div><span>JetKFlow</span></div>
    <nav>{nav.map(item => {const Icon=item.icon;return <button className={active===item.id?'active':''} key={item.id} onClick={()=>choose(item.id)}><Icon/><span>{item.label}</span></button>})}</nav>
    <div className="nav-section"><h4>提醒事项</h4>{smart.map(item => {const Icon=item.icon;return <button className={active==='reminders'&&filter===item.id?'active':''} key={item.id} onClick={()=>{setFilter(item.id);choose('reminders')}}><i style={{background:item.color}}><Icon/></i><span>{item.label}</span><em>{item.count}</em></button>})}</div>
    <div className="nav-section lists"><h4><span>我的列表</span><button className="section-add" onClick={openListCreator} title="新建列表"><Plus/></button></h4>{lists.map(l => <button className={active==='reminders'&&filter===`list:${l.name}`?'active':''} key={l.id} onClick={()=>{setFilter(`list:${l.name}`);choose('reminders')}}><i style={{background:l.color}}/><span>{l.name}</span><em>{reminders.filter(r=>r.list===l.name&&!r.done).length}</em></button>)}</div>
    <div className="sidebar-foot"><button onClick={openSettings}><Settings/><span>设置</span></button><div className="avatar">Z</div></div>
  </aside>
}

function BottomNav({ active, onNavigate }) {
  const items = [
    {id:'home', label:'今日概览', icon:Sparkles},
    {id:'calendar', label:'日历', icon:CalendarDays},
    {id:'reminders', label:'提醒事项', icon:CheckCircle2},
    {id:'notes', label:'便笺', icon:FileText},
  ]
  return <nav className="bottom-nav" aria-label="主要导航">{items.map(item=>{const Icon=item.icon;return <button key={item.id} className={active===item.id?'active':''} onClick={()=>onNavigate(item.id)}><Icon/><span>{item.label}</span></button>})}</nav>
}

function LoginScreen({ initialError = '' }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  useEffect(() => { if (initialError) setError(initialError) }, [initialError])
  const submit = async () => {
    // 个人专用：邮箱固定写在代码里（非机密），密码只存在于 Supabase 服务器端。
    if (!password) { setError('请输入密码'); return }
    setBusy(true); setError('')
    const { data, error: err } = await cloud.auth.signInWithPassword({ email: ALLOWED_EMAIL, password })
    setBusy(false)
    if (err) { setError(err.message === 'Invalid login credentials' ? '密码错误，请重试' : err.message); return }
    if (!data?.session) setError('登录未生效，请稍后重试')
  }
  return <div className="auth-backdrop"><div className="auth-card">
    <div className="auth-mark"><Check/></div>
    <h2>JetKFlow</h2>
    <p>输入密码，同步你的提醒、日历与便笺</p>
    <label className="field"><span>密码</span><input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" onKeyDown={e => e.key === 'Enter' && submit()}/></label>
    <div className="auth-actions">
      <button className="auth-primary" disabled={busy} onClick={submit}>{busy ? '正在登录…' : '登录'}</button>
    </div>
    {error && <p className="auth-error" role="alert" aria-live="polite">{error}</p>}
    <p className="auth-allowlist">个人专用 · 密码仅保存在服务器端</p>
  </div></div>
}

function App() {
  const [settings, setSettings] = useLocalState('jetkflow-settings', {startPage:'home',compact:false})
  const [active, setActive] = useState(settings.startPage || 'home')
  const [filter, setFilter] = useState('today')
  const [reminders, setReminders] = useSyncedState('dayflow-reminders', seedReminders, cloudTables.reminders)
  const [events, setEvents] = useSyncedState('dayflow-events', seedEvents, cloudTables.events)
  const [notes, setNotes] = useSyncedState('dayflow-notes', seedNotes, cloudTables.notes)
  const [lists, setLists] = useSyncedState('jetkflow-lists', defaultLists, cloudTables.lists)
  const [selectedNote, setSelectedNote] = useState(notes[0]?.id)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [viewDate, setViewDate] = useState(now)
  const [addMode, setAddMode] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [listCreatorOpen, setListCreatorOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!cloudReady)
  const [authMessage, setAuthMessage] = useState('')
  const navigate = (view, id) => { setActive(view); if (id) setSelectedNote(id) }
  useEffect(() => { document.documentElement.dataset.density = settings.compact ? 'compact' : 'comfortable' }, [settings.compact])
  useEffect(() => {
    const closeMenu = e => { if (e.key === 'Escape') setMobileOpen(false) }
    const onResize = () => { if (window.innerWidth > 760) setMobileOpen(false) }
    window.addEventListener('keydown', closeMenu); window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('keydown', closeMenu); window.removeEventListener('resize', onResize) }
  }, [])
  useEffect(() => {
    const shortcut = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); setSearchOpen(true) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='n') { e.preventDefault(); setAddMode(active==='calendar'?'event':active==='notes'?'note':'reminder') }
    }
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut)
  }, [active])
  useEffect(() => {
    if (!cloud) return
    const acceptSession = next => {
      if (next && !isAllowedEmail(next.user?.email)) {
        setAuthMessage(AUTH_DENIED_MESSAGE)
        setSession(null)
        setAuthReady(true)
        void cloud.auth.signOut()
        return
      }
      if (next) setAuthMessage('')
      setSession(next)
      setAuthReady(true)
    }
    cloud.auth.getSession().then(({ data }) => acceptSession(data.session))
    const { data: { subscription } } = cloud.auth.onAuthStateChange((_event, next) => acceptSession(next))
    return () => subscription.unsubscribe()
  }, [])
  const signOut = () => { setAuthMessage(''); cloud?.auth.signOut() }
  const addReminder = data => setReminders(rs => [{id:crypto.randomUUID(), list:'个人', color:'#0a84ff', done:false, priority:false, ...data}, ...rs])
  const addEvent = data => {
    const id=crypto.randomUUID(); let reminderId=null
    if (data.sync) { reminderId=crypto.randomUUID(); addReminder({id:reminderId,title:data.title,date:data.date,time:data.start,notes:'从日历同步'}) }
    setEvents(es => [...es, {id,title:data.title,date:data.date,start:data.start,end:data.end,calendar:'个人',color:'#0a84ff',location:'',reminderId}])
  }
  const addNote = data => { const id=crypto.randomUUID(); setNotes(ns => [{id,updated:'刚刚',pinned:false,folder:'便笺',color:'#f0b90b',...data},...ns]); setSelectedNote(id); setActive('notes') }
  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
    if (result === 'granted') new Notification('JetKFlow 提醒已开启', { body: '到时间后，我会在这里提醒你。' })
  }
  useEffect(() => {
    if (notificationPermission !== 'granted') return
    const checkDue = () => {
      const current = new Date()
      const key = dateKey(current)
      const time = `${pad(current.getHours())}:${pad(current.getMinutes())}`
      const sent = JSON.parse(localStorage.getItem('dayflow-notified') || '[]')
      const due = reminders.filter(r => !r.done && r.date === key && r.time === time && !sent.includes(r.id))
      due.forEach(r => new Notification(r.title, { body: `${r.time} · ${r.list || '提醒事项'}`, tag: r.id }))
      if (due.length) localStorage.setItem('dayflow-notified', JSON.stringify([...sent, ...due.map(r => r.id)].slice(-100)))
    }
    checkDue(); const timer = setInterval(checkDue, 30000); return () => clearInterval(timer)
  }, [notificationPermission, reminders])
  useEffect(() => {
    if (!session || !isAllowedEmail(session.user?.email)) return
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const report = error => console.warn('WebMCP registration failed', error)
    try {
      void Promise.resolve(context.registerTool({
        name: 'create_jetkflow_item',
        title: '新建 JetKFlow 项目',
        description: '在 JetKFlow 中创建提醒事项、日程或便笺，并立即更新可见界面。',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['reminder', 'event', 'note'] },
            title: { type: 'string', minLength: 1 },
            date: { type: 'string', description: 'YYYY-MM-DD，提醒事项或日程需要' },
            time: { type: 'string', description: 'HH:MM' },
            content: { type: 'string' },
            syncToReminder: { type: 'boolean' },
          },
          required: ['type', 'title'], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!input || typeof input.title !== 'string' || !input.title.trim()) throw new Error('标题不能为空')
          if (input.type === 'reminder') {
            const id = crypto.randomUUID(); setReminders(rs => [{id,title:input.title.trim(),date:input.date||todayKey,time:input.time||'09:00',notes:input.content||'',list:'个人',color:'#0a84ff',done:false,priority:false},...rs]); return { id, type:'reminder', status:'created' }
          }
          if (input.type === 'event') {
            const id = crypto.randomUUID(); const reminderId = input.syncToReminder ? crypto.randomUUID() : null
            setEvents(es => [...es,{id,title:input.title.trim(),date:input.date||todayKey,start:input.time||'09:00',end:'10:00',calendar:'个人',color:'#0a84ff',location:'',reminderId}])
            if (reminderId) setReminders(rs => [{id:reminderId,title:input.title.trim(),date:input.date||todayKey,time:input.time||'09:00',notes:'从日历同步',list:'个人',color:'#0a84ff',done:false,priority:false},...rs])
            return { id, reminderId, type:'event', status:'created' }
          }
          if (input.type === 'note') {
            const id = crypto.randomUUID(); setNotes(ns => [{id,title:input.title.trim(),content:input.content||'',updated:'刚刚',pinned:false,folder:'便笺'},...ns]); return { id, type:'note', status:'created' }
          }
          throw new Error('不支持的项目类型')
        },
      }, { signal: lifecycle.signal })).catch(report)
      void Promise.resolve(context.registerTool({
        name: 'list_today_jetkflow_items',
        title: '查看今天的 JetKFlow 项目',
        description: '读取今天尚未完成的提醒事项和日程。',
        inputSchema: { type:'object', properties:{}, additionalProperties:false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        async execute() {
          return { date:todayKey, reminders:reminders.filter(r=>r.date===todayKey&&!r.done).map(({id,title,time})=>({id,title,time})), events:events.filter(e=>e.date===todayKey).map(({id,title,start,end})=>({id,title,start,end})) }
        },
      }, { signal: lifecycle.signal })).catch(report)
    } catch (error) { report(error) }
    return () => lifecycle.abort()
  }, [session, setReminders, setEvents, setNotes, reminders, events])
  const results = useMemo(() => query ? [
    ...reminders.filter(r=>r.title.includes(query)).map(r=>({...r,type:'提醒事项',view:'reminders'})),
    ...events.filter(e=>e.title.includes(query)).map(e=>({...e,type:'日历',view:'calendar'})),
    ...notes.filter(n=>(n.title+n.content).includes(query)).map(n=>({...n,type:'便笺',view:'notes'})),
  ] : [], [query, reminders, events, notes])
  if (cloud && !authReady) return <div className="auth-backdrop"><div className="auth-card auth-waiting"><div className="auth-mark"><Check/></div><p>正在连接云端…</p></div></div>
  if (cloud && !session) return <LoginScreen initialError={authMessage} />
  return <div className="app-shell">{mobileOpen && <button className="sidebar-scrim" onClick={()=>setMobileOpen(false)} aria-label="收起菜单"/>}<JetKSidebar active={active} setActive={setActive} filter={filter} setFilter={setFilter} reminders={reminders} lists={lists} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} openListCreator={()=>setListCreatorOpen(true)} openSettings={()=>setSettingsOpen(true)}/><div className="workspace"><div className="topbar"><button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label={mobileOpen?'收起菜单':'展开菜单'}><Menu/></button><button className="search-trigger" onClick={()=>setSearchOpen(true)}><Search/><span>搜索提醒事项、日历与便笺</span><kbd>Ctrl K</kbd></button><button className={`notification-button ${notificationPermission==='granted'?'enabled':''}`} onClick={enableNotifications} title={notificationPermission==='granted'?'提醒已开启':'开启桌面提醒'}><Bell/></button><button className="top-add" onClick={()=>setAddMode(active==='calendar'?'event':active==='notes'?'note':'reminder')}><Plus/></button></div>
    {active==='home' && <Home reminders={reminders} events={events} notes={notes} navigate={navigate} toggleReminder={id=>setReminders(rs=>rs.map(r=>r.id===id?{...r,done:true}:r))}/>} 
    {active==='reminders' && <Reminders reminders={reminders} setReminders={setReminders} filter={filter} lists={lists} openAdd={setAddMode}/>} 
    {active==='calendar' && <CalendarView events={events} setEvents={setEvents} reminders={reminders} setReminders={setReminders} selectedDate={selectedDate} setSelectedDate={setSelectedDate} viewDate={viewDate} setViewDate={setViewDate} openAdd={setAddMode}/>} 
    {active==='notes' && <NotesView notes={notes} setNotes={setNotes} selectedNote={selectedNote} setSelectedNote={setSelectedNote} reminders={reminders} events={events} openAdd={setAddMode} navigate={navigate}/>}</div><BottomNav active={active} onNavigate={view=>{if(view==='reminders')setFilter('today');setActive(view);setMobileOpen(false)}}/>
    {addMode && <QuickAdd mode={addMode} lists={lists} activeList={filter.startsWith('list:')?filter.slice(5):null} onClose={()=>setAddMode(null)} onAddReminder={addReminder} onAddEvent={addEvent} onAddNote={addNote}/>} 
    {listCreatorOpen && <AddListModal onClose={()=>setListCreatorOpen(false)} onAdd={list=>{setLists(items=>[...items,list]);setFilter(`list:${list.name}`);setActive('reminders');setListCreatorOpen(false)}}/>}
    {settingsOpen && <SettingsPanel settings={settings} setSettings={setSettings} notificationPermission={notificationPermission} enableNotifications={enableNotifications} session={session} onSignOut={signOut} onClose={()=>setSettingsOpen(false)}/>}
    {searchOpen && <div className="command-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setSearchOpen(false)}><div className="command-box"><div className="command-input"><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索所有内容…"/><button onClick={()=>setSearchOpen(false)}>ESC</button></div>{query && <div className="command-results">{results.length ? results.map((r,i)=><button key={r.id+i} onClick={()=>{navigate(r.view,r.id);setSearchOpen(false)}}><i>{r.type==='日历'?<CalendarDays/>:r.type==='便笺'?<FileText/>:<CheckCircle2/>}</i><span><b>{r.title}</b><small>{r.type}</small></span><ChevronRight/></button>):<p>没有找到“{query}”</p>}</div>} {!query && <div className="command-tip"><span>快速建议</span><button onClick={()=>{setSearchOpen(false);setAddMode('reminder')}}><Plus/>新建提醒事项<kbd>Ctrl N</kbd></button><button onClick={()=>{navigate('calendar');setSearchOpen(false)}}><CalendarDays/>查看今日日程</button></div>}</div></div>}
  </div>
}

const rootElement = document.getElementById('root')
const appRoot = window.__jetkflowRoot || createRoot(rootElement)
window.__jetkflowRoot = appRoot
appRoot.render(<App />)
