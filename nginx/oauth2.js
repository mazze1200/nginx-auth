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


function requestToken(r, code) {
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
  r.status = 204;
  r.sendHeader();
  r.finish();
}


function authenticate(r) {
  ngx.log(ngx.WARN, "[authenticate] " + JSON.stringify(r))

  // r.headersOut['token'] = "HAllo";
  // r.headersOut['token_payload'] = "JSON.stringify(response)";
  r.status = 200;
  r.sendHeader();
  r.finish();
}



function login(r) {
  ngx.log(ngx.WARN, "[login] " + JSON.stringify(r))

  const code = getCode(r);
  return requestToken(r, code);



  // r.headersOut['token'] = "HAllo";
  // r.headersOut['token_payload'] = "JSON.stringify(response)";
  // r.status = 200;
  // r.sendHeader();
  // r.finish();


}

export default { authenticate, login };
