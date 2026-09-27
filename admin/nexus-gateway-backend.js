/**
 * admin/nexus-gateway-backend.js
 *
 * Custom Decap CMS backend that talks to the Nexus CMS Gateway instead of
 * GitHub directly (replacing the previous `name: github` OAuth backend in
 * config.yml). Registered as CMS.registerBackend("nexus-gateway", ...).
 *
 * Auth model (see Gateway's lib/auth.ts / cms-guard.ts / handoff-exchange
 * route): this page never logs in on its own. A Nexus admin clicks
 * "Edit this site" in the Gateway's /admin dashboard, which redirects
 * here with a one-time token in the URL FRAGMENT:
 *   https://elevatewomeninagroecology.org/admin/#nexus_handoff=<jwt>
 * On load, this file reads that fragment, immediately exchanges it via
 * POST /handoff-exchange for a real session token, and holds that token
 * ONLY in memory (a closure variable below) — never localStorage, never
 * sessionStorage, never sent anywhere except as the Authorization: Bearer
 * header on Gateway API calls. Consequence Grace/Chileshe should know:
 * refreshing this page loses the session — go back to the Nexus dashboard
 * and click "Edit this site" again. That's a deliberate tradeoff (no
 * token sitting in browser storage), not a bug, but worth flagging since
 * it's a real UX difference from the old GitHub-OAuth flow.
 *
 * FIRST PASS / NOT YET RUN AGAINST LIVE DECAP: this targets Decap CMS
 * 3.x's Implementation interface (entriesByFolder / getEntry /
 * persistEntry with `dataFiles` / getMedia / persistMedia / deleteFiles),
 * written from the documented shape rather than tested in a real
 * decap-cms-core runtime. Please dry-run this against a spare branch
 * before pointing Grace at it live — custom-backend shape mismatches
 * (e.g. persistEntry's exact entry object shape) tend to only surface
 * once Decap's actual JS calls in.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Config — fill in GATEWAY_CLIENT_ID before deploying.
  // ---------------------------------------------------------------------
  var GATEWAY_BASE_URL = "https://nexus-cms-gateway.nexus-digital-solutions.workers.dev";

  // EWA's real `clients.id` (a cuid) from the Gateway DB.
  var GATEWAY_CLIENT_ID = "cmujs8hwv0000psp77nvpz8la";

  if (GATEWAY_CLIENT_ID === "REPLACE_WITH_EWA_CLIENT_ID") {
    throw new Error(
      "[nexus-gateway-backend] GATEWAY_CLIENT_ID is still the placeholder \u2014 " +
        "set it to EWA's real client id from the Gateway's /admin/<clientId> URL " +
        "before this backend can talk to the Gateway."
    );
  }

  var API_BASE = GATEWAY_BASE_URL + "/api/cms/" + GATEWAY_CLIENT_ID;

  // ---------------------------------------------------------------------
  // In-memory-only session state. Deliberately not persisted anywhere —
  // see file doc comment above.
  // ---------------------------------------------------------------------
  var sessionToken = null;
  var exchangePromise = null;

  function readHandoffFragment() {
    var hash = window.location.hash || "";
    var match = /(?:^|[#&])\/?nexus_handoff=([^&]+)/.exec(hash);
    if (!match) return null;
    var cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", cleanUrl);
    return decodeURIComponent(match[1]);
  }

  function exchangeHandoffToken(handoffToken) {
    return fetch(API_BASE + "/handoff-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: handoffToken }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.error || "handoff exchange failed (" + res.status + ")");
          }
          return data;
        });
      })
      .then(function (data) {
        sessionToken = data.token;
        return sessionToken;
      });
  }

  /**
   * Ensures we have a session token, exchanging the URL fragment the
   * first time this is called. Safe to call repeatedly — subsequent
   * calls reuse the same in-flight/completed exchange.
   */
  function ensureSession() {
    if (sessionToken) return Promise.resolve(sessionToken);
    if (exchangePromise) return exchangePromise;

    var handoff = readHandoffFragment();
    if (!handoff) {
      return Promise.reject(
        new Error(
          "No Nexus handoff token found. Go back to the Nexus admin dashboard and click \u201cEdit this site\u201d to get here."
        )
      );
    }
    exchangePromise = exchangeHandoffToken(handoff).finally(function () {
      exchangePromise = null;
    });
    return exchangePromise;
  }

  function authedFetch(path, options) {
    options = options || {};
    return ensureSession().then(function (token) {
      var headers = Object.assign({}, options.headers, {
        Authorization: "Bearer " + token,
      });
      if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
    });
  }

  function authedJson(path, options) {
    return authedFetch(path, options).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || "Gateway request failed (" + res.status + ") for " + path);
        }
        return data;
      });
    });
  }

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  function guessMimeType(path) {
    var ext = (path.split(".").pop() || "").toLowerCase();
    var map = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    };
    return map[ext] || "application/octet-stream";
  }

  /**
   * Decap 3.x's Implementation interface was historically documented
   * (and written here) assuming `config`/`collection` are Immutable.js
   * Maps accessed via `.get("key")`. This runtime (decap-cms-core 3.19.1)
   * actually passes plain JS objects instead — confirmed by the runtime
   * error "collection.get is not a function" / "this.config.get is not
   * a function". This helper works with either shape so it's safe
   * regardless of which Decap version/config-passing convention is
   * actually in effect.
   */
  function cfgGet(obj, key, fallback) {
    if (obj == null) return fallback;
    var value;
    if (typeof obj.get === "function") {
      value = obj.get(key);
    } else if (typeof obj.toJS === "function") {
      value = obj.toJS()[key];
    } else {
      value = obj[key];
    }
    if (value === undefined) {
      console.warn(
        "[nexus-gateway-backend] cfgGet(\"" + key + "\") returned undefined. " +
          "Raw object for debugging:",
        obj
      );
    }
    return value === undefined ? fallback : value;
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result);
        var comma = result.indexOf(",");
        resolve(comma === -1 ? result : result.slice(comma + 1));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------
  // The Implementation class Decap registers.
  // ---------------------------------------------------------------------

  function NexusGatewayBackend(config, options) {
    this.config = config;
    this.options = options || {};
    ensureSession().catch(function (err) {
      console.error("[nexus-gateway-backend] handoff exchange failed:", err);
    });
  }

  NexusGatewayBackend.prototype.isGitBackend = function () {
    return false;
  };

  /**
   * authComponent — NOT actually optional in this Decap bundle: the
   * internal Backend wrapper calls `this.implementation.authComponent()`
   * unconditionally (confirmed via runtime error "authComponent is not
   * a function" when this method was removed entirely). It must exist
   * AND return a valid React component (a function), not `null` itself
   * — returning a bare `null` causes React error #130 ("element type is
   * invalid ... got: null") because Decap renders the return value
   * directly as `<AuthComponent />`.
   *
   * Since auth already happens via the handoff-token exchange (no user
   * credentials needed), this returns a minimal function component that
   * renders nothing and, on its first render, calls `props.onLogin({})`
   * once (deferred via setTimeout so it doesn't fire synchronously
   * during React's render phase, which is disallowed) to immediately
   * trigger this.authenticate() below — auto-logging in with no visible
   * login form.
   */
  NexusGatewayBackend.prototype.authComponent = function () {
    var triggered = false;
    return function NexusAutoAuth(props) {
      if (!triggered) {
        triggered = true;
        setTimeout(function () {
          if (props && typeof props.onLogin === "function") {
            props.onLogin({});
          }
        }, 0);
      }
      return null;
    };
  };

  // We never persist the user, so Decap will always end up calling
  // authenticate() on load instead of skipping straight to "logged in".
  NexusGatewayBackend.prototype.restoreUser = function () {
    return Promise.reject(new Error("no persisted Nexus session"));
  };

  NexusGatewayBackend.prototype.authenticate = function () {
    return ensureSession().then(function () {
      return { name: "Nexus Editor", login: "nexus-editor" };
    });
  };

  NexusGatewayBackend.prototype.logout = function () {
    sessionToken = null;
    return Promise.resolve();
  };

  NexusGatewayBackend.prototype.getToken = function () {
    return Promise.resolve(sessionToken);
  };

  /**
   * entriesByFolder — list a collection's folder, then fetch each file's
   * raw content. N+1 by nature (one /entries list call, then one
   * /entries?file=true call per file) — flagged by Simeon as an accepted
   * tradeoff for EWA's current folder sizes, not an oversight.
   */
  NexusGatewayBackend.prototype.entriesByFolder = function (collection, extension) {
    var folder = cfgGet(collection, "folder");
    return authedJson("/entries?path=" + encodeURIComponent(folder)).then(function (listing) {
      var files = (listing.entries || []).filter(function (e) {
        return e.type === "file" && e.path.endsWith("." + extension);
      });
      return Promise.all(
        files.map(function (f) {
          return authedJson("/entries?path=" + encodeURIComponent(f.path) + "&file=true").then(
            function (fileData) {
              return { file: { path: fileData.path, id: fileData.path }, data: fileData.content };
            }
          );
        })
      );
    });
  };

  NexusGatewayBackend.prototype.getEntry = function (path) {
    return authedJson("/entries?path=" + encodeURIComponent(path) + "&file=true").then(function (
      fileData
    ) {
      return { file: { path: fileData.path, id: fileData.path }, data: fileData.content };
    });
  };

  /**
   * entriesByFiles — for `files:`-based collections (fixed named files,
   * e.g. config.yml's "Programme Pages": growher.md, lae.md, team.md),
   * as opposed to `folder:`-based collections which list a directory.
   * Decap calls this method instead of entriesByFolder for that
   * collection type. Missing this entirely caused
   * "this.implementation.entriesByFiles is not a function".
   */
  NexusGatewayBackend.prototype.entriesByFiles = function (collection) {
    var filesConfig = cfgGet(collection, "files", []);
    // filesConfig may itself be an Immutable List, or a plain array.
    var filesArray =
      typeof filesConfig.toJS === "function" ? filesConfig.toJS() : filesConfig;

    return Promise.all(
      filesArray.map(function (fileEntry) {
        var path = cfgGet(fileEntry, "file");
        return authedJson("/entries?path=" + encodeURIComponent(path) + "&file=true").then(
          function (fileData) {
            return { file: { path: fileData.path, id: fileData.path }, data: fileData.content };
          }
        );
      })
    );
  };

  /**
   * persistEntry — writes one or more files via POST /commit. Targets
   * Decap 3.x's `entry.dataFiles` shape, with a fallback to the older
   * single path/raw shape in case the running Decap version differs.
   */
  NexusGatewayBackend.prototype.persistEntry = function (entry, opts) {
    opts = opts || {};
    var message = opts.commitMessage || "Update via Nexus CMS Gateway";

    var files =
      entry.dataFiles && entry.dataFiles.length
        ? entry.dataFiles
        : [{ path: entry.path, raw: entry.raw }];

    var commits = files.map(function (f) {
      return authedJson("/commit", {
        method: "POST",
        body: JSON.stringify({
          path: f.path,
          content: f.raw,
          message: message,
          action: "update",
        }),
      });
    });

    return Promise.all(commits).then(function () {
      return undefined;
    });
  };

  /**
   * getMedia — lists the media folder WITH content (thumbnails), using
   * the content=true param added to /entries for exactly this purpose.
   */
  NexusGatewayBackend.prototype.getMedia = function (folder) {
    var mediaFolder = folder || cfgGet(this.config, "media_folder") || "images/uploads";
    return authedJson(
      "/entries?path=" + encodeURIComponent(mediaFolder) + "&content=true"
    ).then(function (listing) {
      return (listing.entries || [])
        .filter(function (e) {
          return e.type === "file" && e.contentBase64;
        })
        .map(function (e) {
          var dataUri = "data:" + guessMimeType(e.path) + ";base64," + e.contentBase64;
          var name = e.path.split("/").pop();
          return { id: e.sha, name: name, size: e.size, url: dataUri, path: e.path };
        });
    });
  };

  NexusGatewayBackend.prototype.persistMedia = function (file, opts) {
    opts = opts || {};
    var mediaFolder = cfgGet(this.config, "media_folder") || "images/uploads";
    var path = mediaFolder + "/" + file.name;

    return readFileAsBase64(file.fileObj || file).then(function (base64) {
      return authedJson("/media", {
        method: "POST",
        body: JSON.stringify({
          path: path,
          contentBase64: base64,
          message: opts.commitMessage || "Upload media: " + path,
        }),
      }).then(function () {
        var dataUri = "data:" + guessMimeType(path) + ";base64," + base64;
        return {
          id: path,
          name: file.name,
          size: file.size,
          displayURL: dataUri,
          url: dataUri,
          path: path,
        };
      });
    });
  };

  /**
   * deleteFiles — loops one /commit(action:"delete") call per path, per
   * item 5 of the spec. Each delete needs the file's current sha first
   * (the Gateway's /commit requires it), fetched via /entries?file=true.
   * Sequential, not parallel, to be gentle on the GitHub API and keep
   * error attribution to a single path clear if one fails partway.
   */
  NexusGatewayBackend.prototype.deleteFiles = function (paths, commitMessage) {
    var message = commitMessage || "Delete via Nexus CMS Gateway";

    function deleteOne(path) {
      return authedJson("/entries?path=" + encodeURIComponent(path) + "&file=true").then(function (
        fileData
      ) {
        return authedJson("/commit", {
          method: "POST",
          body: JSON.stringify({
            path: path,
            message: message,
            action: "delete",
            sha: fileData.sha,
          }),
        });
      });
    }

    return paths
      .reduce(function (chain, path) {
        return chain.then(function () {
          return deleteOne(path);
        });
      }, Promise.resolve())
      .then(function () {
        return undefined;
      });
  };

  // Expose globally so admin/index.html can register it with CMS.
  window.NexusGatewayBackend = NexusGatewayBackend;
})();