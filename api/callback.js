module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    res.status(400).send('OAuth error: missing code parameter');
    return;
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: 'https://elevatewomeninagroecology.org/api/callback'
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      res.status(400).send(
        `OAuth error: ${tokenData.error_description || tokenData.error || 'unknown error'}`
      );
      return;
    }

    // Decap CMS expects this exact handshake format:
    // 1. Popup posts "authorizing:github" to the opener.
    // 2. Opener replies with a message.
    // 3. Popup posts back "authorization:github:success:{...json...}".
    // The success payload must be a JSON string with a "token" key.
    const tokenPayload = JSON.stringify({ token: tokenData.access_token });

    const script = `
      <!doctype html>
      <html>
        <body>
          <script>
            (function() {
              function receiveMessage(e) {
                window.opener.postMessage(
                  'authorization:github:success:${tokenPayload.replace(/'/g, "\\'")}',
                  e.origin
                );
                window.removeEventListener('message', receiveMessage, false);
              }
              window.addEventListener('message', receiveMessage, false);
              window.opener.postMessage('authorizing:github', '*');
            })();
          </script>
        </body>
      </html>`;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(script);
  } catch (err) {
    res.status(500).send('OAuth callback failed: ' + err.message);
  }
};
