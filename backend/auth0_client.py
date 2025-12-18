import os
import requests
import time
from authlib.jose import jwt

class Auth0Client:
    def __init__(self):
        self.domain = os.getenv("AUTH0_DOMAIN")
        self.client_id = os.getenv("AUTH0_CLIENT_ID")
        self.client_secret = os.getenv("AUTH0_CLIENT_SECRET")
        
        if not all([self.domain, self.client_id, self.client_secret]):
            raise ValueError("Missing Auth0 credentials. Ensure AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET are set in .env")

        self.audience = f"https://{self.domain}/api/v2/"
        self._token = None
        self._token_expiry = 0

    def _get_token(self):
        """Retrieves a Management API token, caching it until expiry."""
        if self._token and time.time() < self._token_expiry:
            return self._token

        url = f"https://{self.domain}/oauth/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "audience": self.audience,
            "grant_type": "client_credentials"
        }
        headers = {'content-type': "application/json"}

        response = requests.post(url, json=payload, headers=headers)
        
        try:
            response.raise_for_status()
        except Exception as e:
            print(f"Auth0 Token Error Body: {response.text}", flush=True)
            raise e

        data = response.json()

        self._token = data["access_token"]
        # Set expiry slightly before actual expiry to be safe (e.g., 60 seconds buffer)
        self._token_expiry = time.time() + data["expires_in"] - 60
        return self._token

    def get_user_by_email(self, email):
        """Searches for an Auth0 user by email and returns their user_id."""
        token = self._get_token()
        url = f"https://{self.domain}/api/v2/users-by-email"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"email": email}

        response = requests.get(url, headers=headers, params=params)
        
        try:
            response.raise_for_status()
        except Exception as e:
            print(f"Auth0 User Lookup Error: {response.text}", flush=True)
            raise e

        users = response.json()

        if not users:
            return None
        
        # Return the first matching user's ID
        return users[0]["user_id"]

    def get_user(self, user_id):
        """Retrieves an Auth0 user by their ID."""
        token = self._get_token()
        url = f"https://{self.domain}/api/v2/users/{user_id}"
        headers = {"Authorization": f"Bearer {token}"}

        response = requests.get(url, headers=headers)
        
        try:
            response.raise_for_status()
        except Exception as e:
            print(f"Auth0 User Get Error: {response.text}", flush=True)
            return None

        return response.json()
