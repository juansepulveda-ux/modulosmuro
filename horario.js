export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main',
    GITHUB_PATH = 'horario.json'
  } = process.env;

  if (![GITHUB_OWNER, GITHUB_REPO].every(Boolean)) {
    return res.status(500).json({ ok: false, error: 'Faltan variables de entorno de GitHub en Vercel.' });
  }

  const encodedPath = GITHUB_PATH.split('/').map(encodeURIComponent).join('/');
  const api = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    'User-Agent': 'muro-mallsport-visor'
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  try {
    const response = await fetch(api, { headers, cache: 'no-store' });
    if (!response.ok) {
      const detail = await response.text();
      console.error('GitHub schedule read failed', response.status, detail);
      return res.status(response.status === 404 ? 404 : 502).json({ ok: false, error: 'No se pudo obtener el horario publicado.' });
    }
    const file = await response.json();
    if (!file?.content || file.encoding !== 'base64') {
      return res.status(502).json({ ok: false, error: 'GitHub devolvió un formato de archivo inesperado.' });
    }
    const text = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
    const horario = JSON.parse(text);
    return res.status(200).json(horario);
  } catch (error) {
    console.error('Schedule read error', error);
    return res.status(502).json({ ok: false, error: 'No se pudo leer el horario publicado.' });
  }
}
