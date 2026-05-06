# IPMI Send Calendar

A hosted internal web app that visualizes projected outbound email sends across the IPMI sales rep team. It pulls live deal data from ActiveCampaign, calculates when each email in the fixed outreach sequence will be sent based on the **"LinkedIn Connection / InMail Sent"** trigger date, and renders everything on an interactive monthly calendar.

---

## What's in this folder

```
/
├── index.html                      # The whole frontend app (vanilla JS)
├── netlify.toml                    # Netlify build/redirect config
├── netlify/
│   └── functions/
│       └── ac-proxy.js             # Server-side proxy to the AC API
└── README.md                       # This file
```

The frontend never talks to ActiveCampaign directly. All AC requests go through `/api/ac` → the Netlify Function → AC API. The API key lives in a Netlify environment variable and is **never exposed to the browser**.

---

## How the data flows

1. Page loads, prompts for the team password (`IPMI2026`).
2. App calls `/api/ac?path=/dealCustomFieldMeta` to find the IDs of the **"0. 2026 Event List"** field and the **"LinkedIn Connection / InMail Sent"** field.
3. App pulls all open deals (`/deals?filters[status]=0`) with pagination.
4. App pulls all values for the two custom fields in bulk (`/dealCustomFieldData?filters[customFieldId]=…`) and joins them onto deals.
5. Deals with no valid event value (TEST/TEMPLATE/blank) or where LinkedIn ≠ Yes are dropped.
6. For each remaining deal, the app fetches `/deals/{id}/logs` (10 concurrent requests) and finds the earliest log entry where the LinkedIn field changed to "Yes". That date is **day 0**.
7. From day 0, the app projects 7 sends per deal at offsets +0, +1, +4, +5, +8, +15, +22.
8. Everything renders on the calendar. Cache lives in `sessionStorage`; the Refresh button clears it and re-fetches.

---

## Deploy — Option A: Drag-and-drop (no GitHub needed)

This is the fastest path if you've never used Netlify before.

1. **Sign up / log in** at <https://app.netlify.com>.
2. On the dashboard, look for **"Add new site"** → **"Deploy manually"** (sometimes labeled **"Deploy a folder"**).
3. Drag the entire `ipmi-calendar` folder (the one containing `index.html`, `netlify.toml`, and the `netlify/` directory) onto the drop zone.
4. Netlify will deploy and assign a random URL like `https://ornate-otter-1234.netlify.app`. **Don't visit it yet** — the API key isn't set, so it won't work.
5. In the site dashboard, go to **Site configuration** → **Environment variables** → **Add a variable**.
6. Name: `AC_API_KEY`. Value: paste the ActiveCampaign API key (find it in AC under **Settings → Developer → API Access → Key**). Scope: **All scopes**. Click **Create variable**.
7. Trigger a redeploy: **Deploys** tab → **Trigger deploy** → **Deploy site**. (Environment variables only take effect on a fresh deploy.)
8. Once the deploy finishes, open the site URL. Enter the password `IPMI2026` and the app will load.

To **update the app later**, just drag the folder onto the Deploys tab's drop zone again.

---

## Deploy — Option B: GitHub integration (recommended for ongoing changes)

1. Create a new repository on GitHub (private is fine) and push these files into it.
2. In Netlify, **Add new site** → **Import an existing project** → **Deploy with GitHub**.
3. Authorize Netlify, pick the repo. Build settings:
   - **Build command:** *(leave blank)*
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions` (Netlify usually picks this up automatically from `netlify.toml`)
4. Click **Deploy site**.
5. Once deployed, go to **Site configuration** → **Environment variables** → add `AC_API_KEY` with the AC key value.
6. **Deploys** tab → **Trigger deploy** → **Deploy site** to pick up the env variable.
7. Now every push to your default branch will redeploy automatically.

---

## Custom domain (optional)

In the Netlify site dashboard:

1. **Domain management** → **Add a domain** → enter `calendar.ipmievents.com` (or whatever).
2. Netlify shows you DNS records to add — either a CNAME pointing to your `xxx.netlify.app` URL, or A records.
3. Add those records at your DNS provider (whoever manages `ipmievents.com` DNS).
4. Once DNS propagates (a few minutes to an hour), Netlify auto-provisions an SSL certificate. The site is then live at the custom domain.

---

## Where to find the AC API key

1. Log into ActiveCampaign.
2. **Settings** (bottom-left) → **Developer**.
3. Copy the value under **Key** (the URL above it should be `https://ipmionline81168.api-us1.com` — that confirms it's the right account).
4. Paste this value into the `AC_API_KEY` environment variable in Netlify.

> **Never** put the key in `index.html`, `ac-proxy.js`, or commit it to GitHub. The Netlify environment variable is the only place it should live.

---

## Troubleshooting

**"Failed to load data: API 500 — AC_API_KEY environment variable is not set"**
The env var isn't set on the Netlify site, or you didn't redeploy after setting it. Set it in **Site configuration → Environment variables**, then **Trigger deploy** → **Deploy site**.

**"Failed to load data: API 403"**
The API key is wrong or has been revoked. Regenerate in AC and update the env variable. Don't forget to redeploy.

**Calendar is empty even after a successful load.**
That means no open deals currently have the LinkedIn field set to "Yes". Verify in AC by opening a deal you'd expect to see and confirming the field is set, and that the deal has the `0. 2026 Event List` field set to a value on the approved list (TEST/TEMPLATE values are filtered out by design).

**Loading is slow on the first refresh.**
The bottleneck is fetching `/deals/{id}/logs` per deal — that's one request per deal in sequence. The app runs 10 of these in parallel and shows a progress counter. With ~1,000 active deals this takes 30–90 seconds. After that it's cached in `sessionStorage` until you click Refresh.

**One day shows a red dot in the corner — what does it mean?**
Any rep on that day has 125 or more projected sends across all events. That's the overload threshold. Click the day to see which rep is over.

**I want to change the password.**
Open `index.html`, search for `const PASSWORD = 'IPMI2026'`, change the value, redeploy. (This is a soft gate, not real security — anyone who reads the page source can see it. Don't use this app for anything that needs real auth.)

**I want to change the sequence offsets.**
Open `index.html`, search for `const SEQUENCE`, edit the array, redeploy.

---

## Notes on what isn't in this build

- No write-back to AC. The app is read-only.
- No real authentication — the password is a JS string check. Treat it as a "keep curious people out" gate, not a security boundary.
- Browser-side cache only (`sessionStorage`). Each user's first load fetches fresh; closing the browser clears the cache.
- The overload flag (125+ sends/day) is calculated against actual rep load regardless of which filter is active, so a day will still flag as overloaded even when you're viewing a single event.
