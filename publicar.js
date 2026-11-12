import crypto from 'node:crypto';

function safeEqual(a = '', b = '') {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function bad(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return bad(res, 405, 'Método no permitido');
  }

  const {
    ADMIN_USER,
    ADMIN_PASSWORD,
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main',
    GITHUB_PATH = 'horario.json'
  } = process.env;

  if (![ADMIN_USER, ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO].every(Boolean)) {
    return bad(res, 500, 'Faltan variables de entorno en Vercel.');
  }

  const { username, password, horario } = req.body || {};

  if (!safeEqual(username, ADMIN_USER) || !safeEqual(password, ADMIN_PASSWORD)) {
    return bad(res, 401, 'Usuario o contraseña incorrectos.');
  }

  if (!horario || typeof horario !== 'object' || !Array.isArray(horario.rows) || !Array.isArray(horario.staff)) {
    return bad(res, 400, 'El JSON del horario no tiene la estructura esperada.');
  }

  const api = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${GITHUB_PATH.split('/').map(encodeURIComponent).join('/')}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2026-03-10',
    'User-Agent': 'muro-mallsport-publicador'
  };

  let sha;
  const getResp = await fetch(`${api}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  if (getResp.ok) {
    const existing = await getResp.json();
    sha = existing.sha;
  } else if (getResp.status !== 404) {
    const detail = await getResp.text();
    console.error('GitHub GET failed', getResp.status, detail);
    return bad(res, 502, `GitHub rechazó la consulta del archivo (${getResp.status}).`);
  }

  const content = Buffer.from(JSON.stringify(horario, null, 2), 'utf8').toString('base64');
  const payload = {
    message: `Actualizar horario Muro Mallsport${horario.date ? ` - ${horario.date}` : ''}`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {})
  };

  const putResp = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await putResp.json().catch(() => ({}));
  if (!putResp.ok) {
    console.error('GitHub PUT failed', putResp.status, result);
    const msg = result?.message ? `: ${result.message}` : '';
    return bad(res, 502, `No se pudo publicar en GitHub (${putResp.status})${msg}`);
  }

  return res.status(200).json({
    ok: true,
    message: sha ? 'Horario actualizado correctamente.' : 'Horario creado correctamente.',
    commitUrl: result?.commit?.html_url || null,
    fileUrl: result?.content?.html_url || null,
    path: GITHUB_PATH,
    branch: GITHUB_BRANCH
  });
}
