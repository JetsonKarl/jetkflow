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
  using (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn')
  with check (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn');

drop policy if exists own_data on public.events;
create policy own_data on public.events
  for all to authenticated
  using (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn')
  with check (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn');

drop policy if exists own_data on public.notes;
create policy own_data on public.notes
  for all to authenticated
  using (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn')
  with check (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn');

drop policy if exists own_data on public.lists;
create policy own_data on public.lists
  for all to authenticated
  using (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn')
  with check (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn');

-- 注册白名单：创建函数后，还需在 Supabase 控制台 Authentication → Hooks 中
-- 将 Before User Created 设置为 public.hook_restrict_jetkflow_signup。
create or replace function public.hook_restrict_jetkflow_signup(event jsonb)
returns jsonb
language plpgsql
as $$
begin
  if lower(coalesce(event->'user'->>'email', '')) <> 'zjyeoe@njust.edu.cn' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', '禁止注册/登录，请联系管理员。'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_restrict_jetkflow_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_jetkflow_signup(jsonb) from authenticated, anon, public;

-- 注册白名单（数据库触发器版）：与上面的 Hook 等效，但纯 SQL 部署，
-- 不需要在控制台手动配置 Authentication → Hooks。两者取其一即可。
create or replace function public.restrict_jetkflow_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) <> 'zjyeoe@njust.edu.cn' then
    raise exception '禁止注册/登录，请联系管理员。';
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_jetkflow_signup on auth.users;
create trigger restrict_jetkflow_signup
  before insert on auth.users
  for each row execute function public.restrict_jetkflow_signup();

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

-- 5. 团队成员
create table if not exists public.members (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default '',
  color text not null default '#0a84ff',
  updated_at timestamptz not null default now()
);
create index if not exists members_user_idx on public.members (user_id);
alter table public.members enable row level security;
drop policy if exists own_data on public.members;
create policy own_data on public.members
  for all to authenticated
  using (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn')
  with check (auth.uid() is not null and auth.uid() = user_id and lower(coalesce(auth.jwt()->>'email', '')) = 'zjyeoe@njust.edu.cn');

-- 日程/提醒事项的成员分配（成员 id 数组）
alter table public.reminders add column if not exists assignees jsonb not null default '[]'::jsonb;
alter table public.events    add column if not exists assignees jsonb not null default '[]'::jsonb;

do $$
begin
  alter publication supabase_realtime add table public.members;
exception when duplicate_object then null;
end $$;
