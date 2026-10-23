import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "TMDB Render test is running",
    test: "/test"
  });
});

app.get("/test", async (req, res) => {
  const key = process.env.TMDB_API_KEY;

  if (!key) {
    return res.status(500).json({
      ok: false,
      error: "TMDB_API_KEY environment variable missing"
    });
  }

  try {
    const url = new URL(
      "https://api.themoviedb.org/3/search/movie"
    );
    url.searchParams.set("api_key", key);
    url.searchParams.set("query", "Inception");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000)
    });

    const body = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        tmdbStatus: response.status,
        error: body.status_message || "TMDB request failed"
      });
    }

    const movie = body.results?.[0];

    res.json({
      ok: true,
      count: body.results?.length ?? 0,
      movie: movie ? {
        title: movie.title,
        tmdb_id: movie.id,
        poster_path: movie.poster_path,
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null
      } : null
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error.name === "TimeoutError"
        ? "TMDB request timed out"
        : error.message
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Test server listening on ${port}`);
});
