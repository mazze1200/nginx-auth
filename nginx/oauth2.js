/**
 * Verify the GitHub OAuth 2.0 token and make sure it belongs to a user that
 * is member of the organization
 *
 * Note: Nginx JavaScript does not support many of the ES6 features, so we
 * are restricted to using ES5 syntax
 */
import qs from "querystring";

function authenticate(r) {
  ngx.log(ngx.WARN,"[authenticate] " + JSON.stringify(r))

  function getCode() {
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


  r.headersOut['token'] = "HAllo";
  r.headersOut['token_payload'] = "JSON.stringify(response)";
  r.status = 204;
  r.sendHeader();
  r.finish();
}

export default { authenticate };
