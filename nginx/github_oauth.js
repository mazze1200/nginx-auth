/**
 * Verify the GitHub OAuth 2.0 token and make sure it belongs to a user that
 * is member of the organization
 *
 * Note: Nginx JavaScript does not support many of the ES6 features, so we
 * are restricted to using ES5 syntax
 */
import qs from "querystring";

function error(r, error, httpCode) {
  ngx.log(ngx.WARN, "[error] " + JSON.stringify(error) + " " + JSON.stringify(httpCode))
  if (httpCode === undefined) httpCode = 401;
  r.error(error);
  r.return(httpCode);
}

function sync_requestToken(r, code) {
  ngx.log(ngx.WARN, "[sync_requestToken]");

  r.subrequest("/github_access_token", 'code=' + code,
    function (reply) {
      ngx.log(ngx.WARN, "[sync_requestToken] reply");
      if (reply.status !== 200)
        return error('OAuth unexpected response from authorization server (HTTP ' + reply.status + '). ' + reply.responseBody, 500);

      try {
        const response = JSON.parse((reply.responseText));
        const token = response['access_token'];

        if (!token) {
          r.return(500, "Toke is missing in reply");
          return;
        }

        ngx.log(ngx.WARN, "[sync_requestToken] " + JSON.stringify(token));

        r.headersOut['token'] = token;
        r.headersOut['Set-Cookie'] = "token=" + token;

        const zone = r.variables['github_state_zone_name'];
        const kv = zone && ngx.shared && ngx.shared[zone];
        if (!kv) {
          throw new Error("JS Zone does not exist");
        }

        const state = r.args.state;
        if (kv.has(state)) {
          const request_uri = kv.get(state);
          kv.delete(state);

          ngx.log(ngx.WARN, "[sync_requestToken] state: " + state + "=" + request_uri);

          r.return(302, request_uri);
        } else {
          r.return(500, "State provided from Github is not known");
        }
      } catch (e) {
        r.return(500, e);
      }
    }
  );
}

function sync_login(r) {
  ngx.log(ngx.WARN, "[sync_login] " + JSON.stringify(r))

  if (r.args && r.args.code && typeof r.args.code === 'string') {
    sync_requestToken(r, r.args.code);
  } else {
    throw new Error("Code is not provided to login");
  }
}


function sync_authenticate(r) {
  if (r.variables.cookie_token) {
    ngx.log(ngx.WARN, "[sync_authenticate] cookie token: " + r.variables.cookie_token);

    r.subrequest("/github_user_info",
      function (reply) {
        ngx.log(ngx.WARN, "[sync_authenticate][github_user_info] reply");
        if (reply.status !== 200)
          return error(r, 'OAuth unexpected response from authorization server (HTTP ' + reply.status + '). ' + reply.responseBody, reply.status);

        let response = JSON.parse((reply.responseText));
        let login = response['login'];

        ngx.log(ngx.WARN, "[user_info] login: " + login)

        r.headersOut['login'] = login;

        r.subrequest("/github_team_membership",
          function (reply) {
            ngx.log(ngx.WARN, "[sync_authenticate][github_team_membership] reply");
            if (reply.status === 200) {
              let response = JSON.parse((reply.responseText));
              let state = response['state'];

              ngx.log(ngx.WARN, "[check_team_membership] state: " + state)

              if (state === "active") {
                r.return(200);
              } else {
                r.return(403, "User is not a member of the team");
              }
            } else {
              error(r, "Error checking team membership", reply.status);
            }
          });
      }
    );
  } else {
    return error(r, "Missing Token", 401);
  }
}
function store_uri(r) {
  const zone = r.variables['github_state_zone_name'];
  const kv = zone && ngx.shared && ngx.shared[zone];
  if (!kv) {
    throw new Error("JS Zone does not exist");
  }

  const random = crypto.getRandomValues(new Uint8Array(32));
  const random_string = Buffer.from(random).toString('base64url')
  const request_uri = r.variables['request_uri'];
  kv.set(random_string, request_uri);

  ngx.log(ngx.WARN, "[store_uri] " + random_string + "=" + request_uri);

  return random_string;
}

function randrom(r) {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const random_string = Buffer.from(random).toString('base64url')
  return random_string;
}

export default { sync_login, sync_authenticate, randrom, store_uri };
