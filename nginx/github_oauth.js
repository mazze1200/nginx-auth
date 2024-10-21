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

function get_kv(zone) {
  const kv = zone && ngx.shared && ngx.shared[zone];
  if (!kv) {
    throw new Error("JS Zone does not exist");
  }

  return kv;
}

function sync_requestToken(r, code) {
  ngx.log(ngx.INFO, "[sync_requestToken]");

  r.subrequest("/_github_access_token", 'code=' + code,
    function (reply) {
      ngx.log(ngx.INFO, "[_github_access_token] reply");

      if (reply.status !== 200) {
        const error_text = 'OAuth unexpected response from authorization server (HTTP ' + reply.status + '). ';
        return error(error_text, 500);
      }

      try {
        const response = JSON.parse((reply.responseText));
        const token = response['access_token'];

        if (!token) {
          return r.return(500, "Toke is missing in reply");
        }

        r.headersOut['Set-Cookie'] = "token=" + token;

        const kv = get_kv(r.variables['github_state_zone_name']);

        const state = r.args.state;
        if (kv.has(state)) {
          const request_uri = kv.get(state);
          kv.delete(state);

          r.return(302, request_uri);
        } else {
          const error_text = "State provided from Github is not known";
          r.return(500, error_text);
        }
      } catch (e) {
        ngx.log(ngx.WARN, "[_github_access_token] exception " + e);
        r.return(500, e);
      }
    }
  );
}

function sync_login(r) {
  ngx.log(ngx.WARN, "[sync_login]")

  if (r.args && r.args.code && typeof r.args.code === 'string') {
    sync_requestToken(r, r.args.code);
  } else {
    throw new Error("Code is not provided to login");
  }
}

function sync_authenticate(r) {
  if (r.variables.cookie_token) {
    ngx.log(ngx.WARN, "[sync_authenticate]");

    const kv = get_kv(r.variables['github_loggedin_zone_name']);

    const logged_in_key = r.variables.github_team + " " + r.variables.cookie_token;
    const logged_in_val = kv.get(logged_in_key);

    if (logged_in_val) {
      // we are storing the user name in as the value of the team+token combination. 
      // The user name is not dependant of the team (only of the token) but it helps reducing complexity (at the cost of ... logic).
      const credentials = JSON.parse((logged_in_val));
      r.headersOut['login'] = credentials.login;
      r.headersOut['name'] = credentials.name;

      return r.return(200);
    } else {
      r.subrequest("/_github_user_info",
        function (reply) {
          ngx.log(ngx.INFO, "/_github_user_info reply");
          if (reply.status !== 200) {
            const error_test = 'OAuth unexpected response from authorization server (HTTP ' + reply.status + '). ';
            return error(r, error_test, reply.status);
          }

          const response = JSON.parse((reply.responseText));
          const login = response['login'];
          const name = response['name'] ? response['name']: login;

          r.headersOut['login'] = login;
          r.headersOut['name'] = name;

          r.subrequest("/_github_team_membership", "login=" + login,
            function (reply) {
              ngx.log(ngx.WARN, "/_github_team_membership reply");
              if (reply.status === 200) {
                let response = JSON.parse((reply.responseText));
                let state = response['state'];

                if (state === "active") {
                  kv.set(logged_in_key, JSON.stringify({
                    login: login,
                    name: name
                  }));

                  r.return(200);
                } else {
                  const error_test = "User is not a member of the team";
                  ngx.log(ngx.INFO, error_test);
                  r.return(403, error_test);
                }
              } else {
                const error_test = "Error checking team membership";
                error(r, error_test, reply.status);
              }
            });
        }
      );
    }
  } else {
    const error_test = "Missing Token";
    error(r, "Missing Token", 401);
  }
}

function store_uri(r) {
  const kv = get_kv(r.variables['github_state_zone_name']);

  const random = crypto.getRandomValues(new Uint8Array(32));
  const random_string = Buffer.from(random).toString('base64url')
  const request_uri = r.variables['request_uri'];
  kv.set(random_string, request_uri);

  return random_string;
}


export default { sync_login, sync_authenticate, store_uri };
