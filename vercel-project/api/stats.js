// API: 获取访客统计数据
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'niupihhxie';
const REPO_NAME = 'children-iq-test';
const DATA_PATH = 'data/visitors.json';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!ghRes.ok) throw new Error(`GitHub read failed: ${ghRes.status}`);
    const json = await ghRes.json();
    const data = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));

    // 最近7天的每日 PV
    const dailyPV = [];
    const daily = data.daily || {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyPV.push({
        date: key,
        pv: daily[key] || 0,
        uv: 0,
      });
    }

    // 今日所有 IP（用于估算 UV）
    const todayKey = new Date().toISOString().split('T')[0];
    const todayIPS = data.ips || [];
    const todayUV = daily[todayKey] ? Math.min(daily[todayKey], todayIPS.length) : 0;

    // Revenue
    const dailyRevenue = data.dailyRevenue || {};
    const totalRevenue = data.totalRevenue || 0;
    const totalPayments = data.totalPayments || 0;
    const todayRevenue = dailyRevenue[todayKey] || 0;

    return res.status(200).json({
      total: data.total || 0,
      totalUV: (data.ips || []).length,
      todayPV: daily[todayKey] || 0,
      todayUV,
      dailyPV,
      totalRevenue,
      todayRevenue,
      totalPayments,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
