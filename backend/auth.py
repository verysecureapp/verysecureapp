from authlib.integrations.flask_oauth2 import ResourceProtector, current_token

# The validator implementation is in validator.py.
# main.py does: `from validator import Auth0JWTBearerTokenValidator`
# and `from auth import require_auth`.
# And then `require_auth.register_token_validator(validator)`.

require_auth = ResourceProtector()

