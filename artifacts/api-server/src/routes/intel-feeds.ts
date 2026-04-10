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

// --- NASA FIRMS: Active fire / VIIRS events ---
router.get("/intel/firms", async (req, res) => {
  try {
    const source = (req.query.source as string) || "VIIRS_SNPP_NRT";
    const days = req.query.days || 1;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/json/${NASA_KEY}/${source}/-180,-90,180,90/${days}`;
    const data = await fetchJSON(url);
    const events = Array.isArray(data) ? data.slice(0, 300).map((f: any) => ({
      id: `fire-${f.latitude}-${f.longitude}-${f.acq_date}`,
      latitude: parseFloat(f.latitude),
      longitude: parseFloat(f.longitude),
      brightness: f.bright_ti4 || f.brightness,
      confidence: f.confidence,
      date: f.acq_date,
      time: f.acq_time,
      satellite: f.satellite,
      frp: f.frp,
      daynight: f.daynight,
    })) : [];
    res.json({ source, count: events.length, events });
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

export default router;
