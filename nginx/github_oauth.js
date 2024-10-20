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

function getCode(r) {
  ngx.log(ngx.WARN, "[getCode] " + JSON.stringify(r.headersIn))


  const requestUrl = r.variables.auth_request_uri;
  if (requestUrl) {
    ngx.log(ngx.WARN, "[getCode] " + JSON.stringify(requestUrl))
    const args = qs.parse(requestUrl.split('?')[1]);
    return args.code;
  }
  else {
    return undefined;
  }
}


function requestToken2(r, code) {
  ngx.log(ngx.WARN, "[requestToken] " + JSON.stringify(code))
  r.subrequest(
    '/_oauth2_send_login_request',
    'code=' + code,
    function (reply) {
      if (reply.status !== 200)
        return error(r,
          'OAuth unexpected response from authorization server (HTTP ' +
          reply.status +
          '). ' +
          reply.responseBody,
          500
        );

      // We have a response from authorization server, validate it has expected JSON schema
      try {
        // Test for valid JSON so that we only store good responses
        var response = JSON.parse(reply.responseBody);
        if (response.error !== undefined)
          return error(r,
            response.error + '\n' + response.error_description,
            500
          );
        verifyToken(r, response.access_token);
      } catch (e) {
        return error(r,
          'OAuth token response is not JSON: ' + reply.responseBody,
          500
        );
      }
    }
  );
}

function verifyToken(r, token) {
  ngx.log(ngx.WARN, "[verifyToken] " + JSON.stringify(token))
  if (typeof token !== 'string' || token.length === 0) return r.return(401);

  r.subrequest(
    '/_oauth2_send_organization_info_request',
    {
      method: 'POST',
      args: 'token=' + token,
      body: JSON.stringify({
        query:
          '{\norganization(login: "' +
          r.variables.github_organization +
          '") {\nteams(first: 40) {\nnodes {\nname\nmembers(first: 40) {\nnodes {\nlogin\n}\n}\n}\n}\n}\nviewer {\nname\nlogin\n}\n}',
      }),
    },
    function (reply) {
      try {
        // Test for valid JSON so that we only store good responses
        var response = JSON.parse(reply.responseBody);
        var teams = {};
        response.data.organization.teams.nodes.forEach(function (node) {
          teams[node.name] = node.members.nodes.map(function (node) {
            return node.login;
          });
        });

        if (Object.keys(teams).length === 0)
          return error(
            'Not a member of ' +
            r.variables.github_organization +
            ' organization',
            403
          );
        r.log(
          'OAuth2 Authentication successful. GitHub Login: ' +
          response.data.viewer.login
        );
        tokenResult(r, {
          token: token,
          name: response.data.viewer.name,
          login: response.data.viewer.login,
          organization: {
            teams: teams,
          },
        });
      } catch (e) {
        return error(
          'OAuth token introspection response is not JSON: ' +
          reply.responseBody,
          500
        );
      }
    }
  );
}


function tokenResult(r, response) {
  ngx.log(ngx.WARN, "[tokenResult] " + JSON.stringify(response))
  // Check for validation success
  // Iterate over all members of the response and return them as response headers
  r.headersOut['token'] = response.token;
  r.headersOut['token_payload'] = JSON.stringify(response);
  // r.status = 204;
  // r.sendHeader();
  // r.finish();
  r.return(204);
}


async function requestToken(r, code) {
  ngx.log(ngx.WARN, "[requestToken] ");

  // await new Promise(r => setTimeout(r, 2000));

  try {
    // let reply = await r.subrequest('http://github:3000/access_token', `code=${code}`)

    const body = JSON.stringify({ code: code })
    ngx.log(ngx.WARN, "[requestToken] body" + body);

    let reply = await r.subrequest("/github_access_token", 'code=' + code,);

    // let reply = await r.subrequest('/_oauth2_send_request')

    ngx.log(ngx.WARN, "[requestToken] we are here ");
    let response = JSON.parse((reply.responseText));
    let token = response['access_token'];

    if (!token) {
      throw new Error("[requestToken] token is not available");
    }

    ngx.log(ngx.WARN, "[requestToken] " + JSON.stringify(token));
    return token;
  } catch (e) {
    r.return(500, e);
  }
}


function to_lower_case(r, data, flags) {
  r.sendBuffer(data.toLowerCase(), flags);
}

function sync_user_info(r, data, flags) {
  ngx.log(ngx.WARN, "[sync_user_info]")
  r.sendBuffer(data.toLowerCase(), flags);

  // throw new Error("code is not rpvided to login");

  // ngx.log(ngx.WARN, "[sync_user_info]")

  // let response = JSON.parse((data));
  // let login = response['login'];

  // ngx.log(ngx.WARN, "[user_info] login: " + login)

  // r.headersOut['login'] = login;
  // r.headersOut['X-login'] = login;

}

function hello_header_filter(r) {
  ngx.log(ngx.WARN, "[hello_header_filter]")
}


async function user_info(r) {
  ngx.log(ngx.WARN, "[user_info]")

  let reply = await r.subrequest("/github_user_info");
  // ngx.log(ngx.WARN, "[user_info] reply: " + JSON.stringify(reply))
  let response = JSON.parse((reply.responseText));
  let login = response['login'];

  ngx.log(ngx.WARN, "[user_info] login: " + login)

  r.headersOut['login'] = login;
  return reply.status;
}

async function check_team_membership(r) {
  ngx.log(ngx.WARN, "[check_team_membership]")

  let reply = await r.subrequest("/github_team_membership");
  if (reply.status === 200) {
    let response = JSON.parse((reply.responseText));
    let state = response['state'];

    ngx.log(ngx.WARN, "[check_team_membership] state: " + state)

    return state === "active";
  }

  ngx.log(ngx.WARN, "[check_team_membership] not a member");

  return false;
}



async function authenticate(r) {
  ngx.log(ngx.WARN, "[authenticate] token " + JSON.stringify(r.variables.token))

  // r.headersOut['token'] = "HAllo";
  // r.headersOut['token_payload'] = "JSON.stringify(response)";
  // r.status = 200;
  // r.sendHeader();
  // r.finish();

  if (r.variables.cookie_token) {
    ngx.log(ngx.WARN, "[authenticate] cookie token: " + r.variables.cookie_token);
    let status = await user_info(r);
    if (status === 200) {
      let membership_status = await check_team_membership(r);
      if (membership_status) {
        r.return(200);
      } else {
        r.return(403, "User is not a member of the team");
      }
      return;
    }
    r.return(status);
  }
  else {
    ngx.log(ngx.WARN, "[authenticate] no token");
    r.return(401);
  }
}



async function login(r) {
  ngx.log(ngx.WARN, "[login] " + JSON.stringify(r))

  const code = getCode(r);
  if (!code) {
    throw new Error("code is not rpvided to login");
  }
  let token = await requestToken(r, code);

  ngx.log(ngx.WARN, "[login] " + "token: " + token)
  // r.status = 204;

  r.headersOut['token'] = token;
  r.headersOut['Set-Cookie'] = "token=" + token;

  r.return(204);
  // r.headersOut['token_payload'] = "JSON.stringify(response)";
  // r.status = 204;
  // r.sendHeader();
  // r.finish();

  // r.internalRedirect('/');
}




function sync_requestToken(r, code) {
  ngx.log(ngx.WARN, "[sync_requestToken]");

  r.subrequest("/github_access_token", 'code=' + code,
    function (reply) {
      ngx.log(ngx.WARN, "[sync_requestToken] reply");
      if (reply.status !== 200)
        return error('OAuth unexpected response from authorization server (HTTP ' + reply.status + '). ' + reply.responseBody, 500);

      try {
        let response = JSON.parse((reply.responseText));
        let token = response['access_token'];

        if (!token) {
          r.return(500, "Toke is missing in reply");
          return;
        }

        ngx.log(ngx.WARN, "[sync_requestToken] " + JSON.stringify(token));

        r.headersOut['token'] = token;
        r.headersOut['Set-Cookie'] = "token=" + token;
        return r.return(204);
        // r.internalRedirect("/_github_authenticate");
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
                return r.return(200);
              } else {
                return r.return(403, "User is not a member of the team");
              }
            } else {
              return error(r, "Error checking team membership", reply.status);
            }
          });
      }
    );
  }else{
    return error(r, "Missing Token", 401);
  }
}



export default { authenticate, login, sync_user_info, hello_header_filter, to_lower_case, sync_login, sync_authenticate };
