import uuid
import re
from datetime import datetime

def generate_clean_slug(text: str) -> str:
    """Creates a URL/folder-friendly ASCII or alphanumeric string."""
    cleaned = re.sub(r'[^\w\s-]', '', text).strip()
    return re.sub(r'[-\s]+', '_', cleaned)

def format_arabic_datetime(dt: datetime) -> str:
    """Formats datetime in Arabic locale standard format."""
    if not dt:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M")
