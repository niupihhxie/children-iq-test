// API: 记录一次访问
// 使用 GitHub 仓库文件作为免费数据库

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'niupihhxie';
const REPO_NAME = 'children-iq-test';
const DATA_PATH = 'data/visitors.json';

function getDateKey() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
}

async function readData() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf-8');
  return { data: JSON.parse(content), sha: json.sha };
}

async function writeData(data, sha) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: 'update: visitor counter',
      content,
      sha,
    }),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const today = getDateKey();
  const body = req.body || {};
  const isPayEvent = body.event === 'pay';
  const payAmount = Number(body.amount) || 1;
  let retries = 3;

  while (retries > 0) {
    try {
      const { data, sha } = await readData();

      // 付费事件
      if (isPayEvent) {
        data.totalRevenue = (data.totalRevenue || 0) + payAmount;
        data.totalPayments = (data.totalPayments || 0) + 1;
        if (!data.dailyRevenue) data.dailyRevenue = {};
        data.dailyRevenue[today] = (data.dailyRevenue[today] || 0) + payAmount;
        if (!data.paymentIPs) data.paymentIPs = [];
        if (!data.paymentIPs.includes(clientIP)) data.paymentIPs.push(clientIP);
        await writeData(data, sha);
        return res.status(200).json({
          event: 'pay',
          totalRevenue: data.totalRevenue,
          todayRevenue: data.dailyRevenue[today],
          totalPayments: data.totalPayments,
        });
      }

      // 普通访问事件
      data.total = (data.total || 0) + 1;
      if (!data.daily) data.daily = {};
      data.daily[today] = (data.daily[today] || 0) + 1;
      if (!data.ips) data.ips = [];
      if (!data.ips.includes(clientIP)) {
        data.ips.push(clientIP);
      }

      await writeData(data, sha);

      return res.status(200).json({
        total: data.total,
        totalUV: data.ips.length,
        todayPV: data.daily[today],
        todayKey: today,
        ip: clientIP,
      });
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('Track error after retries:', err.message);
        return res.status(200).json({ error: 'retry_exhausted', detail: err.message });
      }
      // 等待后重试（处理并发冲突）
      await new Promise(r => setTimeout(r, 200));
    }
  }
}
