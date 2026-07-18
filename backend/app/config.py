import os

# 0 or unset = unlimited scans (dev). Set e.g. 3 to enforce freemium limit.
FREE_SCAN_LIMIT = int(os.getenv("FREE_SCAN_LIMIT", "0"))
