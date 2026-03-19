const NOTION_DB_ID  = '326e185a4dda80a98ebccc436c4bf3b3';
const NOTION_URL    = 'https://api.notion.com/v1/pages';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResponse(body, status, extra) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return corsResponse('Method Not Allowed', 405, {});
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400, { 'Content-Type': 'application/json' });
    }

    const payload = buildNotionPayload(data);

    let notionRes;
    try {
      notionRes = await fetch(NOTION_URL, {
        method: 'POST',
        headers: {
          'Authorization':   'Bearer ' + env.NOTION_API_KEY,
          'Content-Type':    'application/json',
          'Notion-Version':  '2022-06-28',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return corsResponse(
        JSON.stringify({ error: 'Failed to reach Notion', detail: err.message }),
        502,
        { 'Content-Type': 'application/json' }
      );
    }

    const body = await notionRes.text();
    return corsResponse(body, notionRes.status, { 'Content-Type': 'application/json' });
  },
};

function buildNotionPayload(data) {
  const props = {
    'Name': {
      title: [{ text: { content: data.firstName || '' } }],
    },
    'WhatsApp': {
      phone_number: data.phone || '',
    },
    'Neighbourhood': {
      select: { name: data.neighbourhood },
    },
    'Mini Pods': {
      select: { name: data.miniPods },
    },
    'Co-watch': {
      select: { name: data.coWatch },
    },
    'Online Activities': {
      select: { name: data.onlineActivities },
    },
    'Community Background': {
      rich_text: [{ text: { content: data.background || '' } }],
    },
    'Anything Else': {
      rich_text: [{ text: { content: data.anythingElse || '' } }],
    },
    'Local Group Link': {
      url: data.localWhatsapp || null,
    },
    'Submitted At': {
      date: { start: new Date().toISOString() },
    },
  };

  // Child 1–3: send month/year as numbers, null if not provided
  for (let i = 1; i <= 3; i++) {
    const month = data['child' + i + 'Month'];
    const year  = data['child' + i + 'Year'];
    props['Child ' + i + ' Month'] = { number: month ? parseInt(month, 10) : null };
    props['Child ' + i + ' Year']  = { number: year  ? parseInt(year,  10) : null };
  }

  return {
    parent:     { database_id: NOTION_DB_ID },
    properties: props,
  };
}
