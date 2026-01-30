# Atlas – Map‑first Real‑Estate Intelligence Platform

Atlas is a proof‑of‑concept for a modern real‑estate intelligence platform.
It combines real‑time on‑market listing data with deep off‑market public
records on a single, map‑centric interface.  The goal is to democratize
property intelligence by surfacing county‑level tax data, ownership
information and equity insights to anyone – buyers, sellers, agents and
investors.

## Technology Stack

| Layer           | Technology                      | Rationale |
|-----------------|---------------------------------|-----------|
| **Frontend**    | [Next.js](https://nextjs.org/) (App Router) with TypeScript and React | Provides a modern, server‑rendered React framework with file‑system routing, data fetching and API routes. |
| **Styling**     | Tailwind CSS, Lucide Icons      | Utility‑first CSS makes it easy to implement the dark navy, gold and white theme across the app. |
| **Mapping**     | Mapbox GL JS                   | Allows high‑performance, interactive maps with custom markers.  Mapbox markers are regular DOM elements; this means you can create an HTML element, style it and pass it to the [`Marker` constructor](https://docs.mapbox.com/mapbox-gl-js/ja/guides/add-your-data/markers/) to customize its colour and size【576867461038166†L59-L124】. |
| **Database**    | Supabase (PostgreSQL) with PostGIS | Supabase supports the PostGIS extension, which provides efficient and indexable geo‑types like `Point`【700796959370982†L174-L187】.  You can store lat/long points as `geography` and add a GIST index to enable fast spatial queries【700796959370982†L231-L250】. |
| **MLS API**     | Bridge Interactive / SimplyRETS | Both platforms expose MLS data via a normalized REST API.  Bridge’s API delivers a consistent data model across multiple MLSs without additional fees and allows you to replicate data locally【447743033032112†L59-L92】.  SimplyRETS also normalizes RETS/RESO feeds and provides hundreds of search and filter options【751076899162687†L15-L25】. |
| **Payments**    | Stripe Billing (Checkout)       | Stripe Checkout supports subscriptions and trials – you can set up recurring billing and let customers manage their payment details via the built‑in customer portal【459663241589131†L1349-L1356】. |
| **Background jobs** | Inngest                      | Inngest allows you to run background jobs (syncing county data, geocoding addresses, skip‑tracing) without maintaining your own queues; tasks are enqueued and retried automatically【208811001318947†L123-L129】. |

## Data Architecture

The core of Atlas is the `properties` table stored in Supabase.  Each row
represents a parcel or listing, regardless of market status.  The table
includes a `geography(Point)` column (`geom`) so that every property can be
indexed spatially.  PostGIS provides geo‑types that are efficient and
indexable【700796959370982†L174-L185】; a GIST index on the `geom` column
accelerates proximity and bounding‑box queries【700796959370982†L231-L250】.

### Schema Definition

The file `supabase/schema.sql` contains a SQL script to set up the
database.  It performs the following steps:

* Enables the PostGIS extension and creates the `properties` table.
* Stores geographic coordinates in both `latitude`/`longitude` columns and a
  computed `geom` column of type `geography(Point)`.
* Adds standard property fields (price, beds, baths, square footage,
  year built, owner name and contact, tax assessment, equity metrics, etc.).
* Distinguishes on‑market and off‑market properties using a `status`
  column (`'on-market'` or `'off-market'`).
* Implements a trigger (`sync_geom`) to update the `geom` column whenever
  lat/long values change.
* Creates a spatial index (`GIST`) on `geom` for fast geo queries.
* Provides a convenience function `properties_in_view` that returns
  properties within a bounding box and matching a given status.  Your
  application can call this function via Supabase’s RPC interface to fetch
  markers only for the current map view.

You can apply the schema by copying its contents into the **SQL editor** of
your Supabase project or by running it via the Supabase CLI.

### On‑Market Layer

Listings currently for sale (or rent) come from an MLS feed.  To ingest
these records:

1. **Bridge API** – Bridge Interactive offers a stable, consistent RESO Web API
   that normalizes listing data across participating MLSs【447743033032112†L61-L93】.
   You submit license agreements to each MLS through Bridge; once approved
   you can either query their database directly or replicate data to your
   infrastructure.  Bridge does not charge additional service fees or
   contracts【447743033032112†L81-L93】.
2. **SimplyRETS** – A developer‑friendly API that can integrate any RETS or
   RESO feed.  Its normalized data model simplifies working with multiple
   MLSs, and it exposes hundreds of search and filter options with high
   performance and guaranteed uptime【751076899162687†L15-L25】.

When bridging to the MLS, you may choose between:

* **Webhooks / Change Data Capture** – If the MLS or Bridge supports webhooks,
  register a callback URL so that new/updated listings are pushed to your
  backend in near real time.  You can process each payload, transform it
  into your internal format and insert or update it in the `properties`
  table.
* **Periodic Sync via Inngest** – Alternatively, schedule background jobs
  (hourly or daily) using Inngest.  Inngest removes the need for your
  own queue infrastructure; you simply define functions that fetch MLS
  data and Inngest will run them reliably and retry on failure【208811001318947†L123-L129】.

### Off‑Market Layer

Off‑market data comes from public records such as county tax assessor files,
deed history and tax delinquencies.  You can ingest these records by
downloading CSVs from county portals or commercial data providers and
loading them into Supabase.  Write Inngest functions to geocode each
address (using Mapbox geocoding) and update the `geom` column.  Additional
metrics like **years owned** (current year minus last sale year),
**equity percentage** (estimated value vs last sale price) and
**tax delinquent** status should be computed in SQL or via background jobs.

## User Interface & Experience

Atlas follows a **map‑first** paradigm: the map is the primary interface,
with discovery and filtering happening directly on the map.  The UI is
implemented using Tailwind CSS and responds to the dark navy, gold and
white colour palette.  A custom logo (included in `public/logo.png`) sits
in the top left of the page.

### Map

The Map component uses Mapbox GL JS.  Each marker is an HTML element
(DOM node) styled with a background colour – `#007AFF` for active
listings and `#C49A4A` for off‑market properties.  Mapbox allows you
to create custom markers by passing an HTML element to the `Marker`
constructor【576867461038166†L59-L124】 and you can customise its colour and
size【576867461038166†L112-L124】.  When a marker is clicked you should open a
slide‑over panel (not implemented here) with basic details (photos,
address, list price) and **Pro** details (owner contact info, tax
history, debt‑to‑equity estimates).  The map listens to custom
`atlas‑geocode` events dispatched by the search bar to re‑centre on
selected locations.

### Search Bar

The search bar uses the Mapbox **Search Box API** to provide
autocomplete suggestions.  The API exposes `/suggest` and `/retrieve`
endpoints which you call to get suggestions and then retrieve details
about the selected feature【242396211188246†L81-L139】.  You must send a
`session_token` when making requests to group calls for billing
purposes【242396211188246†L142-L149】.  When the user selects a suggestion,
the search bar dispatches a global event with the chosen coordinates; the
Map component listens for this event and flys to the new centre.

### Filters

A high‑speed filter bar should appear along the top of the map.  Standard
filters include price, beds and baths.  Investor‑specific filters may
include:

* **Years owned** – how long the current owner has held the property.
* **Equity %** – ratio of estimated value to last deed amount.
* **Tax delinquent** – whether the owner is behind on property taxes.
* **Absentee owner** – toggle to surface properties where the owner’s
  mailing address differs from the property address.

These filters can be implemented via SQL functions or computed columns
within Supabase.  Combined with the `properties_in_view` function, you
can retrieve only the properties matching both the geographic bounds and
filter criteria.

## Monetisation

Atlas employs a freemium model.  Anonymous users can browse on‑market
listings and see basic public data.  To unlock “Intelligence Mode” –
owner contact information, deed history and investor filters – users
subscribe to a monthly plan via **Stripe Billing**.  Stripe Checkout
supports subscriptions, free trials and recurring payments; you can let
customers manage their payment details through a prebuilt customer portal
【459663241589131†L1349-L1356】.  Use Stripe’s client‑side library
(`@stripe/stripe-js`) to create a Checkout session for the selected
subscription plan and redirect the user to Stripe’s hosted payment page.

## Setting Up

1. **Clone the repository** and install dependencies:

   ```bash
   npm install
   # or with yarn: yarn
   ```

2. **Configure environment variables** by copying `.env.example` to `.env` and
   filling in your Supabase URL and anon key, Mapbox access token, Stripe
   publishable key and Inngest signing key.  Do not commit your secrets to
   version control.

3. **Apply the database schema**.  Open the Supabase dashboard → SQL
   Editor and paste the contents of `supabase/schema.sql`, then run the
   script.  Alternatively, use the Supabase CLI:

   ```bash
   supabase db reset --schema-file ./supabase/schema.sql
   ```

4. **Run the development server**:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

5. **Set up Webhooks or Sync Jobs**.  For MLS data ingest you need to
   obtain API credentials from your MLS via Bridge or SimplyRETS.  Write
   an API route (`app/api/bridge.ts`) to receive webhook payloads or use
   Inngest functions (`inngest/bridgeSync.ts`) to periodically fetch and
   upsert listing data into Supabase.

6. **Add background jobs** with Inngest for geocoding addresses,
   computing equity metrics and updating the tax delinquency status.
   See the [Inngest guide on background jobs](https://www.inngest.com/docs/guides/background-jobs)
   for details on how to define and trigger functions【208811001318947†L123-L129】.

7. **Integrate Stripe** by creating a product and price in the Stripe
   Dashboard.  Use an API route (`app/api/create-checkout-session.ts`) to
   create a checkout session with `mode: 'subscription'` and pass the
   `price` ID.  Upon successful checkout, update the user’s role in
   Supabase to grant access to the Pro view.

## Extending Atlas

This repository provides a foundation for building a full‑featured Atlas
platform.  To complete the product you should:

1. **Implement detail panels** that open when markers are clicked.  Use
   Next.js server components or API routes to fetch additional data
   (photos, owner contact, tax history).  Only show Pro data to paid users.

2. **Build a filter bar** with UI controls for investor filters and hook
   them into your Supabase queries.

3. **Add row‑level security (RLS)** policies in Supabase to restrict
   access to contact info and sensitive columns based on the user’s
   subscription status.

4. **Integrate skip‑tracing** APIs to obtain owner phone and email.  Call
   these services from Inngest functions and store the results in the
   `properties` table.

5. **Design for scale** by caching bounding‑box queries and using
   clustering techniques (e.g., GeoJSON clustering) when rendering large
   numbers of markers.

Atlas is an ambitious vision of how location‑based intelligence can be
democratised.  This repository gives you a starting point for both the
database schema and the front‑end.  Feel free to adapt and extend it to
match your exact requirements.