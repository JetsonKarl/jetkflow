-- JetKFlow 云端数据结构（Supabase / PostgreSQL）
-- 使用方法：Supabase 控制台左侧 SQL Editor → New query → 整段粘贴 → Run
-- 可重复执行，不会破坏已有数据。

-- 1. 提醒事项
create table if not exists public.reminders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  date date,
  time text,
  list text not null default '个人',
  color text not null default '#0a84ff',
  done boolean not null default false,
  priority boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- 2. 日程
create table if not exists public.events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  date date,
  start_time text,
  end_time text,
  calendar text not null default '个人',
  color text not null default '#0a84ff',
  location text not null default '',
  reminder_id uuid,
  updated_at timestamptz not null default now()
);

-- 3. 便笺
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  content_html text,
  folder text not null default '便笺',
  pinned boolean not null default false,
  updated text,
  updated_at timestamptz not null default now()
);

-- 4. 自定义列表
create table if not exists public.lists (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#0a84ff',
  updated_at timestamptz not null default now()
);

-- 查询索引
create index if not exists reminders_user_idx on public.reminders (user_id);
create index if not exists events_user_idx    on public.events (user_id);
create index if not exists notes_user_idx     on public.notes (user_id);
create index if not exists lists_user_idx     on public.lists (user_id);

-- 行级安全（RLS）：登录用户只能读写自己的行。anon key 即使公开也安全的原因。
alter table public.reminders enable row level security;
alter table public.events   enable row level security;
alter table public.notes    enable row level security;
alter table public.lists    enable row level security;

drop policy if exists own_data on public.reminders;
create policy own_data on public.reminders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists own_data on public.events;
create policy own_data on public.events
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists own_data on public.notes;
create policy own_data on public.notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists own_data on public.lists;
create policy own_data on public.lists
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 实时推送（为以后多设备实时同步预留，无害）
do $$
begin
  alter publication supabase_realtime add table public.reminders;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.lists;
exception when duplicate_object then null;
end $$;
