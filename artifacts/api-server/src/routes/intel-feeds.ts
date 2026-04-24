import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const NASA_KEY = process.env.NASA_FIRMS_KEY!;
const OWM_KEY = process.env.OWM_API_KEY!;
const N2YO_KEY = process.env.N2YO_API_KEY!;
const AVWX_KEY = process.env.AVWX_API_KEY!;
const NEWS_KEY = process.env.NEWS_API_KEY!;
const SHODAN_KEY = process.env.SHODAN_API_KEY!;
const GFW_TOKEN = process.env.GFW_TOKEN!;
const SPACETRACK_USER = process.env.SPACETRACK_USER!;
const SPACETRACK_PASS = process.env.SPACETRACK_PASS!;

async function fetchJSON(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

// --- NASA FIRMS: Active fire / VIIRS events (CSV format only on FIRMS area API) ---
router.get("/intel/firms", async (req, res) => {
  try {
    const source = (req.query.source as string) || "VIIRS_SNPP_NRT";
    const days = req.query.days || 1;
    const area = (req.query.area as string) || "world"; // world | usa | europe | asia
    const bbox = area === "usa" ? "-130,24,-66,50"
      : area === "europe" ? "-12,35,40,72"
      : area === "asia" ? "60,-10,150,55"
      : "-180,-90,180,90";
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_KEY}/${source}/${bbox}/${days}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`FIRMS HTTP ${r.status}: ${(await r.text()).slice(0, 100)}`);
    const csv = await r.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return res.json({ source, count: 0, events: [] });
    const headers = lines[0].split(",");
    const idx = (h: string) => headers.indexOf(h);
    const events = lines.slice(1, 800).map((line) => {
      const c = line.split(",");
      return {
        id: `fire-${c[idx("latitude")]}-${c[idx("longitude")]}-${c[idx("acq_date")]}-${c[idx("acq_time")]}`,
        latitude: parseFloat(c[idx("latitude")]),
        longitude: parseFloat(c[idx("longitude")]),
        brightness: parseFloat(c[idx("bright_ti4") >= 0 ? "bright_ti4" : "brightness"]),
        confidence: c[idx("confidence")],
        date: c[idx("acq_date")],
        time: c[idx("acq_time")],
        satellite: c[idx("satellite")],
        frp: parseFloat(c[idx("frp")]),
        daynight: c[idx("daynight")],
      };
    }).filter((f) => !isNaN(f.latitude) && !isNaN(f.longitude));
    res.json({ source, area, count: events.length, events });
  } catch (e: any) {
    logger.error({ err: e.message }, "NASA FIRMS error");
    res.status(502).json({ error: "nasa_firms_unavailable", message: e.message });
  }
});

// --- OpenWeatherMap: Weather at location ---
router.get("/intel/weather", async (req, res) => {
  try {
    const lat = req.query.lat || 0;
    const lon = req.query.lon || 0;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`;
    const data = await fetchJSON(url);
    res.json({
      location: data.name,
      coord: data.coord,
      weather: data.weather?.[0],
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      humidity: data.main?.humidity,
      pressure: data.main?.pressure,
      wind: data.wind,
      visibility: data.visibility,
      clouds: data.clouds?.all,
      description: data.weather?.[0]?.description,
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "OWM error");
    res.status(502).json({ error: "owm_unavailable", message: e.message });
  }
});

// --- OpenWeatherMap: Global weather layer info ---
router.get("/intel/weather/layers", async (_req, res) => {
  res.json({
    availableLayers: [
      { id: "clouds_new", name: "Cloud Cover", unit: "%" },
      { id: "precipitation_new", name: "Precipitation", unit: "mm/h" },
      { id: "temp_new", name: "Temperature", unit: "°C" },
      { id: "wind_new", name: "Wind Speed", unit: "m/s" },
      { id: "pressure_new", name: "Sea Level Pressure", unit: "hPa" },
    ],
    tileUrlTemplate: `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
  });
});

// --- N2YO: Satellites above location ---
router.get("/intel/satellites", async (req, res) => {
  try {
    const lat = req.query.lat || 20;
    const lon = req.query.lon || 0;
    const alt = req.query.alt || 0;
    const radius = req.query.radius || 70;
    const category = req.query.category || 0;
    const url = `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lon}/${alt}/${radius}/${category}/&apiKey=${N2YO_KEY}`;
    const data = await fetchJSON(url);
    res.json({
      count: data.info?.satcount || 0,
      satellites: (data.above || []).map((s: any) => ({
        id: s.satid,
        name: s.satname,
        latitude: s.satlat,
        longitude: s.satlng,
        altitude: s.satalt,
        intDesignator: s.intDesignator,
        launchDate: s.launchDate,
      })),
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "N2YO error");
    res.status(502).json({ error: "n2yo_unavailable", message: e.message });
  }
});

// --- N2YO: TLE for a specific satellite ---
router.get("/intel/satellites/:id/tle", async (req, res) => {
  try {
    const { id } = req.params;
    const url = `https://api.n2yo.com/rest/v1/satellite/tle/${id}&apiKey=${N2YO_KEY}`;
    const data = await fetchJSON(url);
    res.json({
      id: data.info?.satid,
      name: data.info?.satname,
      transactionscount: data.info?.transactionscount,
      tle: data.tle,
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "N2YO TLE error");
    res.status(502).json({ error: "n2yo_tle_unavailable", message: e.message });
  }
});

// --- AVWX: Aviation METARs for major airports ---
router.get("/intel/aviation/metar/:station", async (req, res) => {
  try {
    const { station } = req.params;
    const url = `https://avwx.rest/api/metar/${station}?options=info,translate&format=json`;
    const data = await fetchJSON(url, {
      headers: { Authorization: `Token ${AVWX_KEY}` }
    });
    res.json({
      station: data.station,
      time: data.time,
      raw: data.raw,
      flight_rules: data.flight_rules,
      visibility: data.visibility?.repr,
      wind_direction: data.wind_direction?.repr,
      wind_speed: data.wind_speed?.repr,
      temperature: data.temperature?.repr,
      dewpoint: data.dewpoint?.repr,
      altimeter: data.altimeter?.repr,
      clouds: data.clouds,
      remarks: data.remarks,
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "AVWX METAR error");
    res.status(502).json({ error: "avwx_unavailable", message: e.message });
  }
});

// --- AVWX: TAF for major airports ---
router.get("/intel/aviation/taf/:station", async (req, res) => {
  try {
    const { station } = req.params;
    const url = `https://avwx.rest/api/taf/${station}?format=json`;
    const data = await fetchJSON(url, {
      headers: { Authorization: `Token ${AVWX_KEY}` }
    });
    res.json({
      station: data.station,
      raw: data.raw,
      start_time: data.start_time,
      end_time: data.end_time,
      forecast: data.forecast?.map((f: any) => ({
        type: f.type,
        start_time: f.start_time,
        end_time: f.end_time,
        flight_rules: f.flight_rules,
        wind_direction: f.wind_direction?.repr,
        wind_speed: f.wind_speed?.repr,
        clouds: f.clouds,
      })),
    });
  } catch (e: any) {
    res.status(502).json({ error: "avwx_taf_unavailable", message: e.message });
  }
});

// --- News: Security / geopolitical news ---
router.get("/intel/news", async (req, res) => {
  try {
    const q = (req.query.q as string) || "military conflict war threat security";
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&from=${from}&sortBy=publishedAt&pageSize=30&language=en&apiKey=${NEWS_KEY}`;
    const data = await fetchJSON(url);
    res.json({
      totalResults: data.totalResults,
      articles: (data.articles || []).map((a: any) => ({
        title: a.title,
        source: a.source?.name,
        author: a.author,
        description: a.description,
        url: a.url,
        publishedAt: a.publishedAt,
        urlToImage: a.urlToImage,
      })),
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "NewsAPI error");
    res.status(502).json({ error: "news_unavailable", message: e.message });
  }
});

// --- Shodan: Internet-exposed hosts summary ---
router.get("/intel/shodan/summary", async (req, res) => {
  try {
    const query = (req.query.q as string) || "port:22 country:RU";
    const url = `https://api.shodan.io/shodan/host/count?key=${SHODAN_KEY}&query=${encodeURIComponent(query)}`;
    const data = await fetchJSON(url);
    res.json({ query, total: data.total });
  } catch (e: any) {
    logger.error({ err: e.message }, "Shodan error");
    res.status(502).json({ error: "shodan_unavailable", message: e.message });
  }
});

// --- Shodan: Facets for vulnerability intel ---
router.get("/intel/shodan/facets", async (req, res) => {
  try {
    const query = (req.query.q as string) || "has_vuln:true";
    const url = `https://api.shodan.io/shodan/host/search/facets?key=${SHODAN_KEY}`;
    const data = await fetchJSON(url);
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: "shodan_facets_unavailable", message: e.message });
  }
});

// --- Global Fishing Watch: Fishing vessel activity ---
router.get("/intel/fishing", async (req, res) => {
  try {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    const url = `https://gateway.api.globalfishingwatch.org/v3/events?datasets[0]=public-global-fishing-events:latest&start-date=${startDate}&end-date=${endDate}&limit=50`;
    const data = await fetchJSON(url, {
      headers: {
        Authorization: `Bearer ${GFW_TOKEN}`,
        "Content-Type": "application/json",
      }
    });
    const entries = (data.entries || []).map((e: any) => ({
      id: e.id,
      type: e.type,
      start: e.start,
      end: e.end,
      vessel: e.vessel?.name || e.vessel?.ssvid,
      flag: e.vessel?.flag,
      latitude: e.position?.lat,
      longitude: e.position?.lon,
    }));
    res.json({ total: data.total, count: entries.length, entries });
  } catch (e: any) {
    logger.error({ err: e.message }, "GFW error");
    res.status(502).json({ error: "gfw_unavailable", message: e.message });
  }
});

// --- SpaceTrack: Recent satellite launches and objects ---
router.get("/intel/spacetrack/launches", async (req, res) => {
  try {
    const loginRes = await fetch("https://www.space-track.org/ajaxauth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `identity=${encodeURIComponent(SPACETRACK_USER)}&password=${encodeURIComponent(SPACETRACK_PASS)}`,
    });
    const cookies = loginRes.headers.get("set-cookie");
    if (!cookies) throw new Error("SpaceTrack login failed");

    const dataRes = await fetch(
      "https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/epoch/>now-30/orderby/norad_cat_id/limit/100/format/json",
      { headers: { Cookie: cookies } }
    );
    const data = await dataRes.json();
    const objects = (Array.isArray(data) ? data : []).slice(0, 100).map((o: any) => ({
      norad: o.NORAD_CAT_ID,
      name: o.OBJECT_NAME,
      type: o.OBJECT_TYPE,
      country: o.COUNTRY_CODE,
      epoch: o.EPOCH,
      altitude: Math.round(((o.SEMIMAJOR_AXIS || 6371) - 6371)),
      inclination: o.INCLINATION,
      period: o.PERIOD,
      rcs: o.RCS_SIZE,
    }));
    res.json({ count: objects.length, objects });
  } catch (e: any) {
    logger.error({ err: e.message }, "SpaceTrack error");
    res.status(502).json({ error: "spacetrack_unavailable", message: e.message });
  }
});

// --- AbuseIPDB / Abuse.ch: Malware samples ---
router.get("/intel/malware", async (req, res) => {
  try {
    const url = "https://mb-api.abuse.ch/api/v1/";
    const formData = new URLSearchParams();
    formData.append("query", "get_recent");
    formData.append("selector", "100");
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Auth-Key": process.env.ABUSE_CH_KEY!,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(12000),
    });
    const data = await r.json();
    const samples = (data.data || []).slice(0, 50).map((s: any) => ({
      sha256: s.sha256_hash,
      md5: s.md5_hash,
      type: s.file_type,
      name: s.file_name,
      size: s.file_size,
      firstSeen: s.first_seen,
      lastSeen: s.last_seen,
      tags: s.tags || [],
      signature: s.signature,
      imphash: s.imphash,
    }));
    res.json({ count: samples.length, samples });
  } catch (e: any) {
    logger.error({ err: e.message }, "Abuse.ch error");
    res.status(502).json({ error: "abuse_ch_unavailable", message: e.message });
  }
});

// ===========================================================================
// FREE OSINT ENDPOINTS — no API keys required, suitable for live map overlays
// ===========================================================================

const cache = new Map<string, { ts: number; data: any }>();
async function cached(key: string, ttlMs: number, fn: () => Promise<any>) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < ttlMs) return hit.data;
  const data = await fn();
  cache.set(key, { ts: now, data });
  return data;
}

// --- USGS Earthquakes (real-time, global) ---
router.get("/intel/osint/earthquakes", async (req, res) => {
  try {
    const window = (req.query.window as string) || "day"; // hour | day | week
    const min = (req.query.min as string) || "all"; // all | 1.0 | 2.5 | 4.5 | significant
    const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${min}_${window}.geojson`;
    const data = await cached(`quakes:${window}:${min}`, 60_000, () => fetchJSON(url));
    const events = (data.features || []).map((f: any) => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      tsunami: f.properties.tsunami === 1,
      alert: f.properties.alert,
      sig: f.properties.sig,
      type: f.properties.type,
      url: f.properties.url,
      depthKm: f.geometry.coordinates[2],
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
    res.json({ source: "USGS", count: events.length, generated: data.metadata?.generated, events });
  } catch (e: any) {
    logger.error({ err: e.message }, "USGS error");
    res.status(502).json({ error: "usgs_unavailable", message: e.message });
  }
});

// --- NASA EONET (wildfires, storms, volcanoes, icebergs, floods) ---
router.get("/intel/osint/disasters", async (req, res) => {
  try {
    const days = req.query.days || "10";
    const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${days}`;
    const data = await cached(`eonet:${days}`, 5 * 60_000, () => fetchJSON(url));
    const events = (data.events || []).flatMap((ev: any) => {
      const last = ev.geometry?.[ev.geometry.length - 1];
      if (!last?.coordinates) return [];
      const [lon, lat] = Array.isArray(last.coordinates[0]) ? last.coordinates[0] : last.coordinates;
      const cat = ev.categories?.[0]?.title || "Event";
      return [{
        id: ev.id,
        title: ev.title,
        category: cat,
        categoryId: ev.categories?.[0]?.id,
        sources: (ev.sources || []).map((s: any) => s.id),
        link: ev.link,
        date: last.date,
        magnitude: last.magnitudeValue,
        magnitudeUnit: last.magnitudeUnit,
        lat: typeof lat === "number" ? lat : null,
        lon: typeof lon === "number" ? lon : null,
      }];
    }).filter((e: any) => e.lat !== null && e.lon !== null);
    res.json({ source: "NASA EONET", count: events.length, events });
  } catch (e: any) {
    logger.error({ err: e.message }, "EONET error");
    res.status(502).json({ error: "eonet_unavailable", message: e.message });
  }
});

// --- International Space Station live position (no key) ---
router.get("/intel/osint/iss", async (_req, res) => {
  try {
    const data = await fetchJSON("https://api.wheretheiss.at/v1/satellites/25544");
    res.json({
      source: "wheretheiss.at",
      id: "ISS-25544",
      name: "International Space Station",
      lat: data.latitude,
      lon: data.longitude,
      altitudeKm: data.altitude,
      velocityKmh: data.velocity,
      visibility: data.visibility,
      footprintKm: data.footprint,
      solarLat: data.solar_lat,
      solarLon: data.solar_lon,
      timestamp: data.timestamp,
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "ISS error");
    res.status(502).json({ error: "iss_unavailable", message: e.message });
  }
});

// --- GDACS active disaster alerts (RSS feed parsed) ---
router.get("/intel/osint/gdacs", async (_req, res) => {
  try {
    const url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?fromDate=&toDate=&alertlevel=Green;Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF";
    const data = await cached("gdacs", 5 * 60_000, () => fetchJSON(url));
    const events = (data.features || []).map((f: any) => {
      const p = f.properties || {};
      const c = f.geometry?.coordinates || [];
      return {
        id: p.eventid,
        eventType: p.eventtype,
        eventName: p.eventname,
        alertLevel: p.alertlevel,
        alertScore: p.alertscore,
        country: p.country,
        episodeId: p.episodeid,
        from: p.fromdate,
        to: p.todate,
        url: p.url?.report,
        severity: p.severitydata?.severity,
        severityText: p.severitydata?.severitytext,
        population: p.population?.population,
        lat: c[1],
        lon: c[0],
      };
    }).filter((e: any) => typeof e.lat === "number" && typeof e.lon === "number");
    res.json({ source: "GDACS", count: events.length, events });
  } catch (e: any) {
    logger.error({ err: e.message }, "GDACS error");
    res.status(502).json({ error: "gdacs_unavailable", message: e.message });
  }
});

// ===========================================================================
// AUTHENTICATED INTEL FEEDS — using user-provided API keys
// ===========================================================================

// --- Live aircraft positions via RapidAPI ADSBExchange (paid key) ---
router.get("/intel/aircraft/live", async (req, res) => {
  try {
    if (!process.env.RAPIDAPI_KEY) return res.status(404).json({ error: "no_rapidapi_key" });
    const lat = parseFloat((req.query.lat as string) || "40");
    const lon = parseFloat((req.query.lon as string) || "0");
    const dist = Math.min(parseInt((req.query.dist as string) || "250"), 250); // nautical miles, max 250
    const url = `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${lat}/lon/${lon}/dist/${dist}/`;
    const data = await cached(`adsb:${lat}:${lon}:${dist}`, 15_000, async () => {
      const r = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "adsbexchange-com1.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`ADSB HTTP ${r.status}: ${(await r.text()).slice(0, 100)}`);
      return r.json();
    });
    const aircraft = (data.ac || []).filter((a: any) => a.lat != null && a.lon != null).map((a: any) => ({
      icao24: a.hex,
      callsign: a.flight?.trim(),
      registration: a.r,
      type: a.t,
      category: a.category,
      lat: a.lat, lon: a.lon,
      altitudeFt: a.alt_baro === "ground" ? 0 : a.alt_baro,
      onGround: a.alt_baro === "ground",
      groundSpeedKt: a.gs,
      headingDeg: a.track,
      verticalRateFpm: a.baro_rate,
      squawk: a.squawk,
      emergency: a.emergency,
      operator: a.ownOp,
      destination: a.destination,
      origin: a.origin,
      mil: a.dbFlags === 1,
    }));
    res.json({ source: "ADSB Exchange", center: { lat, lon }, distNm: dist, count: aircraft.length, aircraft });
  } catch (e: any) {
    logger.error({ err: e.message }, "ADSB error");
    res.status(502).json({ error: "adsb_unavailable", message: e.message });
  }
});

// --- Military aircraft only (uses ADSBExchange military filter) ---
router.get("/intel/aircraft/military", async (_req, res) => {
  try {
    if (!process.env.RAPIDAPI_KEY) return res.status(404).json({ error: "no_rapidapi_key" });
    const url = `https://adsbexchange-com1.p.rapidapi.com/v2/mil/`;
    const data = await cached("adsb:mil", 30_000, async () => {
      const r = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "adsbexchange-com1.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`ADSB HTTP ${r.status}: ${(await r.text()).slice(0, 100)}`);
      return r.json();
    });
    const aircraft = (data.ac || []).filter((a: any) => a.lat != null && a.lon != null).map((a: any) => ({
      icao24: a.hex, callsign: a.flight?.trim(), registration: a.r, type: a.t,
      lat: a.lat, lon: a.lon,
      altitudeFt: a.alt_baro === "ground" ? 0 : a.alt_baro,
      groundSpeedKt: a.gs, headingDeg: a.track,
      operator: a.ownOp, mil: true, country: a.country,
    }));
    res.json({ source: "ADSB Exchange (Military)", count: aircraft.length, aircraft });
  } catch (e: any) {
    logger.error({ err: e.message }, "ADSB mil error");
    res.status(502).json({ error: "adsb_mil_unavailable", message: e.message });
  }
});

// --- Cesium Ion access token (frontend needs to receive it) ---
router.get("/intel/cesium/token", (_req, res) => {
  if (!process.env.CESIUM_ION_TOKEN) return res.status(404).json({ error: "no_cesium_token" });
  res.json({ token: process.env.CESIUM_ION_TOKEN });
});

// --- OWM tile URL for frontend overlays (returns appid-bearing template) ---
router.get("/intel/weather/tile", (req, res) => {
  if (!process.env.OWM_KEY) return res.status(404).json({ error: "no_owm_key" });
  const layer = (req.query.layer as string) || "clouds_new";
  const valid = ["clouds_new", "precipitation_new", "pressure_new", "wind_new", "temp_new"];
  const safe = valid.includes(layer) ? layer : "clouds_new";
  res.json({
    layer: safe,
    template: `https://tile.openweathermap.org/map/${safe}/{z}/{x}/{y}.png?appid=${process.env.OWM_KEY}`,
  });
});

// --- Planet API: imagery quick search (Daily product) ---
router.get("/intel/planet/search", async (req, res) => {
  try {
    if (!process.env.PLANET_API_KEY) return res.status(404).json({ error: "no_planet_key" });
    const lat = parseFloat((req.query.lat as string) || "0");
    const lon = parseFloat((req.query.lon as string) || "0");
    const days = parseInt((req.query.days as string) || "7");
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const body = {
      item_types: ["PSScene"],
      filter: {
        type: "AndFilter",
        config: [
          {
            type: "GeometryFilter", field_name: "geometry",
            config: { type: "Point", coordinates: [lon, lat] },
          },
          {
            type: "DateRangeFilter", field_name: "acquired",
            config: { gte: since },
          },
          {
            type: "RangeFilter", field_name: "cloud_cover",
            config: { lte: 0.3 },
          },
        ],
      },
    };
    const r = await fetch("https://api.planet.com/data/v1/quick-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "api-key " + process.env.PLANET_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`Planet HTTP ${r.status}: ${(await r.text()).slice(0, 100)}`);
    const data = await r.json();
    const items = (data.features || []).slice(0, 20).map((f: any) => ({
      id: f.id,
      type: f.properties?.item_type,
      acquired: f.properties?.acquired,
      cloudCover: f.properties?.cloud_cover,
      satellite: f.properties?.satellite_id,
      providerName: f.properties?.provider,
      pixelResolution: f.properties?.pixel_resolution,
      geometry: f.geometry,
    }));
    res.json({ source: "Planet Labs", count: items.length, items });
  } catch (e: any) {
    logger.error({ err: e.message }, "Planet error");
    res.status(502).json({ error: "planet_unavailable", message: e.message });
  }
});

// --- AISStream subscription token (live vessel WS — frontend connects via WSS) ---
router.get("/intel/maritime/aisstream/token", (_req, res) => {
  if (!process.env.AISSTREAM_KEY) return res.status(404).json({ error: "no_aisstream_key" });
  res.json({
    endpoint: "wss://stream.aisstream.io/v0/stream",
    apiKey: process.env.AISSTREAM_KEY,
    instructions:
      'Send {"APIKey":"<key>","BoundingBoxes":[[[lat1,lon1],[lat2,lon2]]],"FilterMessageTypes":["PositionReport"]} after connect.',
  });
});

// --- Aggregate OSINT pulse (all-in-one for the map) ---
router.get("/intel/osint/pulse", async (_req, res) => {
  const out: any = { generatedAt: new Date().toISOString(), sources: {} };
  const tasks = [
    ["earthquakes", "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"],
    ["disasters", "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=10"],
    ["iss", "https://api.wheretheiss.at/v1/satellites/25544"],
    ["gdacs", "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?alertlevel=Green;Orange;Red"],
  ] as const;
  await Promise.all(tasks.map(async ([key, url]) => {
    try {
      out.sources[key] = { ok: true, data: await cached(`pulse:${key}`, 60_000, () => fetchJSON(url)) };
    } catch (e: any) {
      out.sources[key] = { ok: false, error: e.message };
    }
  }));
  res.json(out);
});

export default router;
