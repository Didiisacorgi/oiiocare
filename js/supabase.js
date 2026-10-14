/* Same Supabase auth / REST / RPC shape as the marketing site's app.js. */
(function (root) {
  const cfg = () => root.OIIO_PUBLIC || {};

  function headers(token) {
    const h = {
      apikey: cfg().SUPABASE_ANON_KEY,
      "content-type": "application/json"
    };
    if (token) h.authorization = "Bearer " + token;
    return h;
  }

  async function sbAuth(path, body) {
    const r = await fetch(cfg().SUPABASE_URL + "/auth/v1/" + path, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.error_description || data.msg || data.error || data.message || "auth_failed");
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function sbUser(token) {
    const r = await fetch(cfg().SUPABASE_URL + "/auth/v1/user", { headers: headers(token) });
    if (!r.ok) return null;
    return r.json();
  }

  async function sbRest(session, path, init) {
    init = init || {};
    if (!session || !session.access_token) throw new Error("unauthorized");
    const r = await fetch(cfg().SUPABASE_URL + "/rest/v1/" + path, {
      method: init.method || "GET",
      headers: Object.assign({}, headers(session.access_token), {
        prefer: init.prefer || "return=representation"
      }, init.headers || {}),
      body: init.body == null ? undefined : (typeof init.body === "string" ? init.body : JSON.stringify(init.body))
    });
    if (r.status === 204) return null;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.message || data.error || "rest_failed");
      err.status = r.status;
      throw err;
    }
    return data;
  }

  async function sbRpc(session, name, payload) {
    if (!session || !session.access_token) throw new Error("unauthorized");
    const r = await fetch(cfg().SUPABASE_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: headers(session.access_token),
      body: JSON.stringify(payload || {})
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.message || data.error || "rpc_failed");
      err.status = r.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  root.OiioSb = { headers, sbAuth, sbUser, sbRest, sbRpc };
})(typeof window !== "undefined" ? window : globalThis);
