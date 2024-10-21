# NGINX Github Auth
This is a nginx config for authenticating users against teams of a github org.

It is highly inspired by 
https://github.com/specify/nginx-with-github-auth

## Config
In your nginx.conf include 
```code
load_module modules/ngx_http_js_module.so;
```

A minimal server example may look like this 
```code
# Include this at the nginx http level
include github_http.conf;

server {
	listen 443 ssl;
    listen [::]:443 ssl;

	server_name secure.example.org;

    # Include ssl certs
    include ssl_certs.conf;

    # Include github app credentials
    include auth_github.conf;
    include github_server.conf;

	location / {        
        # Include this for locations that need authentication
        include github_location.conf;
        set $github_team "access-sample";
		proxy_pass http://whoami;
    }

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

A auth_github.conf may look like this 
```code
# Client ID of the created GitHub App (see ../README.md)
set $oauth_client_id "<app id>";

# Client Secret of the created GitHub App (see ../README.md)
set $oauth_client_secret "<app secret>";

# Name of the GitHub organization whose members can access the app
set $github_organization "<name of your org>";

```


