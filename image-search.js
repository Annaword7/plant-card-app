// Поиск фотографий растения по названию.
//
// Русские названия сортов поиск по картинкам почти не находит, поэтому сначала
// просим модель перевести название в ботаническую латынь («Гортензия метельчатая
// Polar Bear» → «Hydrangea paniculata Polar Bear»), а уже по ней идём в источники:
// Wikimedia Commons и Openverse работают без ключей и отдают лицензию с автором,
// Google Images подключается, если заданы GOOGLE_CSE_KEY и GOOGLE_CSE_CX.

const UA = "plant-card-app/1.0 (https://rozarugoza.ru)";
const MIN_SIDE = 800;          // «крупные»: меньшая сторона не меньше этого
const WANT = 20;               // сколько отдаём в выдачу
const TIMEOUT = 15000;

const queryCache = new Map();

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const stripHtml = (s) =>
  String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// ---------- запросы на латинице ----------

export async function buildQueries(client, model, plantName, typeLabel) {
  const key = `${plantName}|${typeLabel}`;
  if (queryCache.has(key)) return queryCache.get(key);

  const fallback = [plantName];
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 200,
      thinking: { type: "disabled" },
      system: `Ты ботаник. По названию растения верни ТОЛЬКО JSON-массив из 2–3 строк — поисковых запросов на латинице для поиска фотографий.

Правила:
- Первый запрос — максимально точный: род, вид и сорт латиницей (например: "Hydrangea paniculata Polar Bear").
- Второй — без сорта, только род и вид (например: "Hydrangea paniculata").
- Третий (если уместно) — род и характерная часть растения по-английски (например: "Malus domestica apple fruit").
- Без кавычек внутри строк, без пояснений, без markdown.`,
      messages: [{ role: "user", content: `Растение: ${plantName}\nТип: ${typeLabel || "—"}` }],
    });
    const text = message.content?.[0]?.text || "[]";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const queries = parsed.filter(q => typeof q === "string" && q.trim()).slice(0, 3);
    const result = queries.length ? queries : fallback;
    queryCache.set(key, result);
    return result;
  } catch (e) {
    console.error("Не удалось построить латинские запросы:", e.message);
    return fallback;
  }
}

// ---------- источники ----------

async function searchWikimedia(query) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  // filetype:bitmap — иначе по запросам вроде «Hydrangea paniculata Polar Bear»
  // выдача состоит из PDF-каталогов семян, а не из фотографий
  api.search = new URLSearchParams({
    action: "query", format: "json", origin: "*",
    generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "40",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata",
  });

  const data = await getJson(api);
  const pages = Object.values(data?.query?.pages || {});

  return pages
    .map(page => {
      const info = page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || "")) return null;
      if (Math.min(info.width, info.height) < MIN_SIDE) return null;

      const file = encodeURIComponent(page.title.replace(/^File:/, ""));
      const path = `https://commons.wikimedia.org/wiki/Special:FilePath/${file}`;
      const meta = info.extmetadata || {};

      return {
        id: `wm-${page.pageid}`,
        thumb: `${path}?width=400`,
        full: `${path}?width=1600`,
        width: info.width,
        height: info.height,
        title: page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
        author: stripHtml(meta.Artist?.value) || "неизвестен",
        license: stripHtml(meta.LicenseShortName?.value) || "см. страницу файла",
        sourceUrl: info.descriptionurl,
        source: "Wikimedia Commons",
      };
    })
    .filter(Boolean);
}

// Для файла, лежащего на Викискладе, Special:FilePath отдаёт миниатюру любой ширины
function commonsThumb(url, width) {
  const m = /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?\w\/\w{2}\/([^/?#]+)/.exec(url || "");
  return m ? `https://commons.wikimedia.org/wiki/Special:FilePath/${m[1]}?width=${width}` : null;
}

// Openverse отдаёт машинные имена источников — приводим к читаемым
const SOURCE_NAMES = {
  flickr: "Flickr",
  wikimedia: "Wikimedia Commons",
  rawpixel: "Rawpixel",
  stocksnap: "StockSnap",
  smithsonian_gardens: "Smithsonian Gardens",
  inaturalist: "iNaturalist",
};

async function searchOpenverse(query) {
  const api = new URL("https://api.openverse.org/v1/images/");
  // page_size больше 20 анонимным запросам Openverse не отдаёт (отвечает 401)
  api.search = new URLSearchParams({
    q: query, page_size: "20", size: "large", mature: "false",
  });

  const data = await getJson(api);

  return (data?.results || [])
    .filter(r => r.url && Math.min(r.width || 0, r.height || 0) >= MIN_SIDE)
    .map(r => ({
      id: `ov-${r.id}`,
      // Превью самого Openverse часто отвечает 424, поэтому для файлов,
      // лежащих на Викискладе, берём миниатюру оттуда напрямую
      thumb: commonsThumb(r.url, 400) || r.thumbnail || r.url,
      full: commonsThumb(r.url, 1600) || r.url,
      width: r.width,
      height: r.height,
      title: r.title || query,
      author: r.creator || "неизвестен",
      license: [r.license, r.license_version].filter(Boolean).join(" ").toUpperCase(),
      sourceUrl: r.foreign_landing_url || r.url,
      source: SOURCE_NAMES[r.source] || r.source || "Openverse",
    }));
}

// Подключается, только если в окружении заданы ключи Google Custom Search
async function searchGoogle(query) {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];

  const api = new URL("https://www.googleapis.com/customsearch/v1");
  api.search = new URLSearchParams({
    key, cx, q: query, searchType: "image", imgSize: "xlarge", num: "10", safe: "active",
  });

  const data = await getJson(api);

  return (data?.items || [])
    .filter(i => Math.min(i.image?.width || 0, i.image?.height || 0) >= MIN_SIDE)
    .map(i => ({
      id: `g-${i.link}`,
      thumb: i.image.thumbnailLink,
      full: i.link,
      width: i.image.width,
      height: i.image.height,
      title: i.title,
      author: i.displayLink,
      license: "лицензия не проверена",
      sourceUrl: i.image.contextLink || i.link,
      source: i.displayLink,
    }));
}

// ---------- общий поиск ----------

// Один и тот же файл Викисклада приходит и из Commons, и из Openverse —
// сравниваем по имени файла, раскодировав его
const dedupKey = (img) => {
  const name = (img.full || "").split("/").pop().split("?")[0];
  try {
    return decodeURIComponent(name).toLowerCase();
  } catch {
    return name.toLowerCase();
  }
};

// Редкие сорта в открытых источниках не представлены, а вид и род — почти всегда.
// Поэтому к запросам добавляем укороченные: род с видом, затем один род.
const broaden = (query) => {
  const words = query.split(/\s+/).filter(Boolean);
  return [words.slice(0, 2).join(" "), words[0]].filter(q => q && q !== query);
};

export async function searchImages({ client, model, plantName, typeLabel, query }) {
  const queries = query?.trim()
    ? [query.trim()]
    : await buildQueries(client, model, plantName, typeLabel);

  for (const broader of broaden(queries[queries.length - 1])) {
    if (!queries.includes(broader)) queries.push(broader);
  }

  const images = [];
  const seen = new Set();

  // Запросы идут от точного к общему: добираем, пока не наберётся 20 картинок
  for (const q of queries) {
    const batches = await Promise.allSettled([
      searchGoogle(q),
      searchWikimedia(q),
      searchOpenverse(q),
    ]);

    for (const batch of batches) {
      if (batch.status === "rejected") {
        console.error("Источник не ответил:", batch.reason?.message);
        continue;
      }
      for (const img of batch.value) {
        const key = dedupKey(img);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        images.push({ ...img, query: q });
      }
    }
    if (images.length >= WANT) break;
  }

  // Крупные вперёд: на карточку идёт квадрат 800×800
  images.sort((a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height));

  return { queries, images: images.slice(0, WANT) };
}

// ---------- прокси ----------

// Картинка с чужого домена «пачкает» canvas, и выгрузить карточку в JPG уже нельзя.
// Поэтому выбранное фото скачивает сервер и отдаёт data-URL.
const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

const MAX_BYTES = 15 * 1024 * 1024;

export async function fetchImageAsDataUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Некорректная ссылка");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Поддерживаются только http и https");
  if (PRIVATE_HOST.test(url.hostname)) throw new Error("Недопустимый адрес");

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Источник ответил ${res.status}`);

  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error("По ссылке не картинка");

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new Error("Файл больше 15 МБ");

  return `data:${type.split(";")[0]};base64,${buffer.toString("base64")}`;
}
