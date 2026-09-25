from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory rate limiter using IP address key
limiter = Limiter(key_func=get_remote_address)
