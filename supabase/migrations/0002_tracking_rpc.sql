-- Adds an RPC for the public /c/{code} endpoint to log clicks AND increment the
-- recipient's click counter atomically. Called via the service-role key in the
-- Netlify function, so RLS does not need to be relaxed for anon users.

create or replace function public.log_click(
  p_recipient_id uuid,
  p_user_agent text default null,
  p_referrer text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_campaign uuid;
  v_merchant uuid;
begin
  select campaign_id, merchant_id
    into v_campaign, v_merchant
    from public.campaign_recipients
   where id = p_recipient_id;

  if v_campaign is null then
    return;
  end if;

  update public.campaign_recipients
     set click_count = click_count + 1,
         first_click_at = coalesce(first_click_at, now()),
         last_click_at = now()
   where id = p_recipient_id;

  insert into public.clicks (recipient_id, campaign_id, merchant_id, user_agent, referrer)
  values (p_recipient_id, v_campaign, v_merchant, p_user_agent, p_referrer);
end;
$$;

revoke all on function public.log_click(uuid, text, text) from public;
grant execute on function public.log_click(uuid, text, text) to service_role;
