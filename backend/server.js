try {
  process.loadEnvFile();
} catch {
  // No .env file yet — fine for most of the app, but AI image generation
  // needs AI_HORDE_API_KEY set there (see README).
}

const { app } = await import('./app.js');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Wisdom Studio backend listening on http://localhost:${PORT}`);
});
