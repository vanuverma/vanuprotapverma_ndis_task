# Instructions
Download the code from this repo https://github.com/vanuverma/vanuprotapverma_ndis_task.git


## api-gateway
- Inside a terminal, navigate to the `api-gateway` folder
- Execute command `npm install` to install packages
- Create new file named `.env`
- Copy over all the values from `.env.example` into `.env` file
- Replace the `AUTH0_CLIENT_ID` value from the shared secret
- Execute command `npm run start` to start the `api gateway` app 
- `API GATEWAY` will start running on `http://localhost:3000`


## user-api
- Inside another terminal window, navigate to the `user-api` folder
- Execute command `npm install` to install packages
- Create new file named `.env`
- Copy over all the values from `.env.example` into `.env` file
- Execute command `npm run start` to start the `user api` app 
- `USER API` will start running on `http://localhost:4000`


## Getting Access Token
- Since there are no web interface, we need to obtain `access_token` using a curl command.
- The curl command contains actual AUTH0 id and secret therefore will be shared separately
- A dummy user has been added to Auth0 to facilitate the testing
- Update below curl command with the shared secrets
- In the new terminal, execute the updated curl command with actual values
- From the curl command response, copy the value of `access_token` property
- Use the `access_token` value into `api-gateway.http` where outlined

```
curl --request POST \
  --url "https://ndia-demo.au.auth0.com/oauth/token" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=http://auth0.com/oauth/grant-type/password-realm" \
  --data-urlencode "client_id=<REPLACE_FROM_SHARED_SECRET>" \
  --data-urlencode "realm=Username-Password-Authentication" \
  --data-urlencode "client_secret=<REPLACE_FROM_SHARED_SECRET>" \
  --data-urlencode "username=<REPLACE_FROM_SHARED_SECRET>" \
  --data-urlencode "password=<REPLACE_FROM_SHARED_SECRET>" \
  --data-urlencode "audience=https://vpv-ndia-demo-api.com" \
  --data-urlencode "scope=openid email"
```

## Testing

- Both `api-gateway` and `user-api` contains dedicated `.http` files with sample curl requests
- After starting both the apps separately, execute these curl commands in a new terminal
- Modify the commands as needed to test success and failure cases

## Request flow

User make the api call 
    -> Request reaches API Gateway (running at http://localhost:3000/) 
        -> Auth middleware executes -> Auth middleware verifies Jwt Token 
                                    -> [decision]
                                        -> Jwt verified successfully
                                            -> Extracts userId from verified token
                                            -> Adds new `X-Verified-User` header
                                        -> Jwt verification failed 
                                            -> Terminates the flow
                                            -> Returns response
        -> Gateway proxy executes
            -> Proxies allowed requests to internal user-api 
                -> user-api proceeses request
                    -> verify-user middleware executes
                        -> [decision]
                            -> `X-Verified-User` header found
                                -> process request
                            -> `X-Verified-User` header NOT found
                                -> block request