module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;

  // Hardcoded apex redirect — matches the GitHub OAuth App callback URL exactly.
  // Do NOT derive this from req.headers.host: Vercel can pass "www" even on apex
  // requests, which causes a redirect_uri mismatch at GitHub.
  const redirectUri = 'https://elevatewomeninagroecology.org/api/callback';

  const authorizeUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=repo,user`;

  res.writeHead(302, { Location: authorizeUrl });
  res.end();
};
