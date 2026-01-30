-- Atlas database schema
--
-- This script creates the core `properties` table for Atlas.  It enables
-- PostGIS for spatial queries, defines the table structure, sets up a
-- geometry column and GIST index, and provides helper functions and
-- triggers.  Run this script in your Supabase project's SQL editor.

-- Enable PostGIS extension (creates the `extensions` schema).  You must
-- enable this in the Supabase dashboard once; subsequent calls have no effect.
create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- Table: properties
-- Each row represents a parcel or listing, whether on‑market or off‑market.
-- The `status` column distinguishes between the two modes.  The `geom`
-- column stores the spatial point and is maintained via a trigger.
create table if not exists public.properties (
    id uuid not null default uuid_generate_v4() primary key,
    mls_id text unique,
    status text not null default 'off-market',
    address text,
    city text,
    state text,
    postal_code text,
    latitude numeric,
    longitude numeric,
    geom geography(point) not null,
    list_price numeric,
    sale_price numeric,
    bedrooms integer,
    bathrooms integer,
    square_feet integer,
    year_built integer,
    owner_name text,
    owner_email text,
    owner_phone text,
    last_sale_date date,
    last_sale_price numeric,
    tax_assessed_value numeric,
    years_owned integer,
    equity_percent numeric,
    tax_delinquent boolean default false,
    absentee_owner boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Spatial index for fast geo queries (bounding boxes, nearest neighbours).
create index if not exists properties_gix on public.properties using gist (geom);

-- -------------------------------------------------------------------------
-- Trigger: sync_geom
-- When a row is inserted or updated, derive the geom column from the
-- latitude and longitude values.  If lat/long are null, the geom remains
-- unchanged and should be set manually.
create or replace function public.sync_geom()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_geom on public.properties;
create trigger trg_sync_geom
before insert or update on public.properties
for each row execute procedure public.sync_geom();

-- -------------------------------------------------------------------------
-- Function: properties_in_view
-- Returns properties within a bounding box and matching a given status.
-- Useful for fetching markers in the current map view.  Supabase RPC can
-- call this function: supabase.rpc('properties_in_view', { min_lat, min_long, max_lat, max_long, mode }).
create or replace function public.properties_in_view(
  min_lat float,
  min_long float,
  max_lat float,
  max_long float,
  mode text
)
returns table (
  id uuid,
  mls_id text,
  status text,
  latitude float,
  longitude float,
  list_price numeric,
  sale_price numeric,
  bedrooms integer,
  bathrooms integer,
  square_feet integer,
  year_built integer,
  owner_name text
) language sql stable as $$
  select
    id,
    mls_id,
    status,
    ST_Y(geom::geometry) as latitude,
    ST_X(geom::geometry) as longitude,
    list_price,
    sale_price,
    bedrooms,
    bathrooms,
    square_feet,
    year_built,
    owner_name
  from public.properties
  where status = mode
    and geom && ST_MakeEnvelope(min_long, min_lat, max_long, max_lat, 4326)::geography;
$$;

-- -------------------------------------------------------------------------
-- TODO: Additional tables (deeds, tax_records) could be created here to
-- normalise deed history and tax assessments.  For example:
--
-- create table if not exists public.deeds (
--   id uuid not null default uuid_generate_v4() primary key,
--   property_id uuid references public.properties (id) on delete cascade,
--   deed_date date,
--   deed_amount numeric,
--   grantee text,
--   grantor text
-- );
--
-- Indexes and functions for deeds, tax delinquency, etc. can be added as
-- needed.