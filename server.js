import express from "express";

const app = express();
const port = process.env.PORT || 3000;
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

async function tmdb(path, params = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY missing in Render Environment");

  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", key);

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.status_message || `TMDB HTTP ${response.status}`);
  }

  return data;
}

app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PopcornPlay — Movie Test</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#101014;color:#fff;font-family:Arial,sans-serif}
header{padding:18px 5%;background:#19191f;position:sticky;top:0;z-index:2}
.brand{font-size:25px;font-weight:bold;color:#ffca28}
.search{display:flex;gap:8px;margin-top:14px}
input{min-width:0;flex:1;padding:13px;border:1px solid #444;border-radius:8px;background:#25252d;color:white;font-size:16px}
button{border:0;border-radius:8px;padding:12px 16px;background:#ffca28;color:#111;font-weight:bold;cursor:pointer}
nav{display:flex;gap:10px;padding:18px 5%;overflow:auto}
nav button{white-space:nowrap}
nav button.active{background:#fff}
main{padding:0 5% 35px}
h2{font-size:21px}
#status{color:#bbb;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px 12px}
.card{min-width:0;cursor:pointer}
.card img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover;background:#292930;border-radius:9px}
.card .title{font-size:14px;font-weight:bold;margin-top:8px;line-height:1.35}
.card .year{font-size:12px;color:#aaa;margin-top:5px}
footer{padding:25px 5%;color:#aaa;font-size:12px}
@media(max-width:700px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 10px}}
@media(max-width:380px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head>
<body>
<header>
  <div class="brand">🍿 PopcornPlay <small style="color:#aaa;font-size:12px">TEST</small></div>
  <form id="searchForm" class="search">
    <input id="query" placeholder="Search movies..." autocomplete="off">
    <button type="submit">Search</button>
  </form>
</header>
<nav>
  <button class="active" data-mode="trending">Trending</button>
  <button data-mode="popular">Popular</button>
</nav>
<main>
  <h2 id="heading">Trending Movies</h2>
  <div id="status">Loading movies...</div>
  <div class="grid" id="movies"></div>
</main>
<footer>
  Movie data and images provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
</footer>
<script>
const grid = document.getElementById("movies");
const statusEl = document.getElementById("status");
const heading = document.getElementById("heading");
const queryInput = document.getElementById("query");
let mode = "trending";

async function loadMovies(url, title) {
  heading.textContent = title;
  grid.replaceChildren();
  statusEl.textContent = "Loading...";
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");

    const movies = data.results || [];
    statusEl.textContent = movies.length
      ? movies.length + " movies found"
      : "No movies found.";

    for (const movie of movies) {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = movie.title || movie.name || "Movie poster";
      img.src = movie.poster_path
        ? "https://image.tmdb.org/t/p/w500" + movie.poster_path
        : "";
      img.onerror = () => {
        img.removeAttribute("src");
        img.alt = "Poster unavailable";
      };

      const name = document.createElement("div");
      name.className = "title";
      name.textContent = movie.title || movie.name || "Untitled";

      const year = document.createElement("div");
      year.className = "year";
      year.textContent = (movie.release_date || movie.first_air_date || "")
        .slice(0, 4) + " · TMDB ID: " + movie.id;

      card.append(img, name, year);
      card.title = "TMDB ID: " + movie.id;
      grid.appendChild(card);
    }
  } catch (error) {
    statusEl.textContent = "Error: " + error.message;
  }
}

function loadMode(nextMode) {
  mode = nextMode;
  queryInput.value = "";
  document.querySelectorAll("nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  loadMovies("/api/" + mode, mode === "popular" ? "Popular Movies" : "Trending Movies");
}

document.querySelectorAll("nav button").forEach(button => {
  button.addEventListener("click", () => loadMode(button.dataset.mode));
});

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  const q = queryInput.value.trim();
  if (!q) {
    loadMode(mode);
    return;
  }
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  loadMovies("/api/search?query=" + encodeURIComponent(q), "Search Results");
});

loadMode("trending");
</script>
</body>
</html>`);
});

// Existing test endpoint: keep it working
app.get("/test", async (req, res) => {
  try {
    const data = await tmdb("/search/movie", { query: "Inception" });
    const movie = data.results?.[0];
    res.json({
      ok: true,
      count: data.results?.length ?? 0,
      movie: movie ? {
        title: movie.title,
        tmdb_id: movie.id,
        poster_path: movie.poster_path,
        poster_url: movie.poster_path ? IMG + movie.poster_path : null
      } : null
    });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

app.get("/api/trending", async (req, res) => {
  try {
    res.json(await tmdb("/trending/movie/day"));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("/api/popular", async (req, res) => {
  try {
    res.json(await tmdb("/movie/popular"));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.query || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Please provide ?query=movie name" });
  }

  try {
    res.json(await tmdb("/search/movie", { query }));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get("/api/movie/:id", async (req, res) => {
  if (!/^\\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid TMDB movie ID" });
  }

  try {
    res.json(await tmdb("/movie/" + req.params.id));
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log("PopcornPlay test server listening on " + port);
});
