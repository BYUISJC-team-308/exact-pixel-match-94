begin;
-- Only business records are editable here. Auth uses the provider Admin API,
-- while saved items, votes, analytics and audit history keep their existing workflows.
create function public.maintain_records(
  p_table text, p_action text default 'list', p_id text default null,
  p_values jsonb default '{}'::jsonb, p_original jsonb default null, p_page integer default 0
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  fields jsonb; result jsonb; previous jsonb; total bigint;
  column_list text; value_list text; assignments text;
  field record; item record; supported text[] := array['deals','food_events','ss_deals','colleges','campuses','campus_buildings'];
begin
  if auth.uid() is null or not public.current_user_is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if not p_table=any(supported) or p_table is null then
    raise exception 'Choose a supported records table' using errcode='22023';
  end if;
  if p_action not in ('list','create','update','delete') or p_action is null then
    raise exception 'Choose a supported action' using errcode='22023';
  end if;
  -- Schema metadata makes required fields, enums and defaults match the installed database.
  select jsonb_agg(jsonb_build_object('name',a.attname,'type',t.typname,
    'nullable',not a.attnotnull,'hasDefault',d.adbin is not null,
    'readOnly',a.attgenerated<>'' or a.attidentity<>'' or a.attname=any(array['id','created_at','updated_at','user_id','upvotes_count','real_votes_count','fake_votes_count','verification_status','source_key']),
    'options',(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_catalog.pg_enum e where e.enumtypid=t.oid)
  ) order by a.attnum) into fields
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid=a.attrelid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_type t on t.oid=a.atttypid
  left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where n.nspname='public' and c.relname=p_table and a.attnum>0 and not a.attisdropped;
  if fields is null then raise exception 'This records table is not installed'; end if;
  if p_action='list' then
    if p_page is null or p_page<0 or p_page>100000 then raise exception 'Invalid page'; end if;
    execute format('select count(*) from public.%I',p_table) into total;
    execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from (select * from public.%I order by id limit 25 offset $1) r',p_table)
      into result using p_page*25;
    return jsonb_build_object('fields',fields,'rows',result,'total',total);
  end if;
  if jsonb_typeof(p_values) is distinct from 'object' then raise exception 'Expected record fields'; end if;
  if p_action in ('update','delete') then
    execute format('select to_jsonb(t) from public.%I t where id::text=$1 for update',p_table) into previous using p_id;
    if previous is null then raise exception 'This record was removed. Refresh the list.' using errcode='40001'; end if;
    if p_original is distinct from previous then raise exception 'This record changed. Refresh before saving.' using errcode='40001'; end if;
  end if;
  if p_action='delete' then
    -- FK constraints prevent orphaned records. PostgreSQL handles configured cascades.
    execute format('delete from public.%I where id::text=$1',p_table) using p_id;
    return jsonb_build_object('id',p_id);
  end if;
  for item in select key,value from jsonb_each(p_values) loop
    select x.* into field from jsonb_to_recordset(fields) as x(name text,"readOnly" boolean) where name=item.key;
    if not found or field."readOnly" then raise exception 'Field % is managed by the system',item.key using errcode='22023'; end if;
    column_list := concat_ws(',',column_list,format('%I',item.key));
    value_list := concat_ws(',',value_list,format('r.%I',item.key));
    assignments := concat_ws(',',assignments,format('%I=r.%I',item.key,item.key));
  end loop;
  -- Imported tables use source_key as provenance. Manual records receive a unique key.
  if p_action='create' and exists(select 1 from jsonb_to_recordset(fields) as f(name text) where name='source_key') then
    column_list:=concat_ws(',',column_list,'source_key');
    value_list:=concat_ws(',',value_list,quote_literal('manual:'||gen_random_uuid()::text));
  end if;
  if column_list is null then raise exception 'Enter at least one editable field'; end if;
  if p_action='create' then
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',p_table,column_list,value_list,p_table,p_table)
      into result using p_values;
  else
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id::text=$2 returning to_jsonb(t.*)',p_table,assignments,p_table)
      into result using p_values,p_id;
  end if;
  return result;
end $$;
revoke all on function public.maintain_records(text,text,text,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.maintain_records(text,text,text,jsonb,jsonb,integer) to authenticated;
commit;
