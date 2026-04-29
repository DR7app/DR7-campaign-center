-- DR7 Campaign Center — initial schema
-- Multi-tenant: 1 auth user = 1 merchant. Each merchant only sees their own data via RLS.
-- Run this once in the Supabase SQL editor of the campaign-center project.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- MERCHANTS — one row per signed-up business
-- ============================================================
create table public.merchants (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type text,
  contact_phone text,
  contact_email text,
  default_target_url text,
  conversion_modes jsonb not null default '["manual"]'::jsonb,
  custom_domain text unique,
  brand_color text default '#0EA5A4',
  webhook_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index merchants_owner_id_uniq on public.merchants(owner_id);

-- ============================================================
-- LEADS — contacts owned by a merchant
-- ============================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  first_name text not null,
  last_name text,
  phone text not null,
  phone_normalized text not null,
  email text,
  tags text[] not null default '{}',
  list text,
  consent text not null default 'Attivo',
  notes text,
  source text default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz
);
create index leads_merchant_id_idx on public.leads(merchant_id);
create unique index leads_merchant_phone_uniq on public.leads(merchant_id, phone_normalized);

-- ============================================================
-- BROADCAST LISTS — groups of leads
-- ============================================================
create table public.broadcast_lists (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index broadcast_lists_merchant_id_idx on public.broadcast_lists(merchant_id);

create table public.broadcast_list_members (
  list_id uuid not null references public.broadcast_lists(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, lead_id)
);

-- ============================================================
-- MEDIA
-- ============================================================
create table public.media (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  url text not null,
  type text not null check (type in ('image','video')),
  size bigint,
  created_at timestamptz not null default now()
);
create index media_merchant_id_idx on public.media(merchant_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  message text not null,
  recipient_mode text not null check (recipient_mode in ('all','broadcast','manual')),
  selected_broadcast_ids uuid[] not null default '{}',
  selected_lead_ids uuid[] not null default '{}',
  status text not null default 'Bozza',
  schedule jsonb,
  media_id uuid references public.media(id) on delete set null,
  target_url text,
  conversion_mode text not null default 'manual'
    check (conversion_mode in ('manual','whatsapp','landing','webhook','booking')),
  discount_amount numeric,
  discount_type text check (discount_type in ('percentage','fixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_merchant_id_idx on public.campaigns(merchant_id);

-- ============================================================
-- CAMPAIGN RECIPIENTS — the heart of tracking
-- One row per (campaign, lead). 'code' is globally unique → maps URL/QR/manual code to a recipient.
-- ============================================================
create table public.campaign_recipients (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  code text not null unique,
  click_count int not null default 0,
  first_click_at timestamptz,
  last_click_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id),
  conversion_value numeric,
  conversion_note text,
  created_at timestamptz not null default now()
);
create index campaign_recipients_campaign_id_idx on public.campaign_recipients(campaign_id);
create index campaign_recipients_merchant_id_idx on public.campaign_recipients(merchant_id);
create index campaign_recipients_lead_id_idx on public.campaign_recipients(lead_id);
create unique index campaign_recipients_campaign_lead_uniq
  on public.campaign_recipients(campaign_id, lead_id);

-- ============================================================
-- CLICKS — one row per /c/{code} hit. Used for analytics.
-- ============================================================
create table public.clicks (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.campaign_recipients(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  user_agent text,
  ip_country text,
  referrer text
);
create index clicks_recipient_id_idx on public.clicks(recipient_id);
create index clicks_merchant_id_idx on public.clicks(merchant_id);
create index clicks_occurred_at_idx on public.clicks(occurred_at desc);

-- ============================================================
-- REDEMPTIONS — audit log of every conversion event
-- ============================================================
create table public.redemptions (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.campaign_recipients(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  channel text not null check (channel in ('manual','whatsapp','landing','webhook','booking')),
  amount numeric,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index redemptions_recipient_id_idx on public.redemptions(recipient_id);
create index redemptions_merchant_id_idx on public.redemptions(merchant_id);
create index redemptions_created_at_idx on public.redemptions(created_at desc);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_merchants_updated_at        before update on public.merchants
  for each row execute function public.set_updated_at();
create trigger trg_leads_updated_at            before update on public.leads
  for each row execute function public.set_updated_at();
create trigger trg_broadcast_lists_updated_at  before update on public.broadcast_lists
  for each row execute function public.set_updated_at();
create trigger trg_campaigns_updated_at        before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — every authenticated request only sees its own merchant's data
-- ============================================================
alter table public.merchants                enable row level security;
alter table public.leads                    enable row level security;
alter table public.broadcast_lists          enable row level security;
alter table public.broadcast_list_members   enable row level security;
alter table public.media                    enable row level security;
alter table public.campaigns                enable row level security;
alter table public.campaign_recipients      enable row level security;
alter table public.clicks                   enable row level security;
alter table public.redemptions              enable row level security;

create or replace function public.current_merchant_id()
returns uuid language sql stable security definer as $$
  select id from public.merchants where owner_id = auth.uid() limit 1;
$$;

-- merchants: each user can only see/edit their own row
create policy merchants_self_select on public.merchants for select to authenticated
  using (owner_id = auth.uid());
create policy merchants_self_insert on public.merchants for insert to authenticated
  with check (owner_id = auth.uid());
create policy merchants_self_update on public.merchants for update to authenticated
  using (owner_id = auth.uid());

-- standard "my-merchant-only" policy for the rest
create policy leads_all on public.leads for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

create policy broadcast_lists_all on public.broadcast_lists for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

create policy broadcast_list_members_all on public.broadcast_list_members for all to authenticated
  using (exists (select 1 from public.broadcast_lists bl
                 where bl.id = list_id and bl.merchant_id = public.current_merchant_id()))
  with check (exists (select 1 from public.broadcast_lists bl
                      where bl.id = list_id and bl.merchant_id = public.current_merchant_id()));

create policy media_all on public.media for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

create policy campaigns_all on public.campaigns for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

create policy campaign_recipients_all on public.campaign_recipients for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

create policy clicks_select on public.clicks for select to authenticated
  using (merchant_id = public.current_merchant_id());
-- clicks INSERT happens via service-role from /c/{code} Netlify function (bypasses RLS by design)

create policy redemptions_all on public.redemptions for all to authenticated
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());
