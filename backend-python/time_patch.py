# -*- coding: utf-8 -*-
"""
Time Patch Module for Look.ai Backend
=====================================
Corrects system clock skew by fetching the real UTC time from Google's servers
and monkeypatching `time.time()` and `google.auth._helpers.utcnow()` so that
Firebase/Google Auth JWT tokens are signed with the correct timestamp.

IMPORTANT: This module MUST be imported before any Google Auth / Firebase
imports to ensure the patch is applied before JWT signing occurs.
"""
import os
import time
import datetime
import urllib.request
import email.utils

_offset = 0.0
_patched = False
_original_time = None


def _fetch_real_time_offset():
    """Fetches the real UTC time from Google and calculates the offset."""
    global _offset
    try:
        response = urllib.request.urlopen("https://www.google.com", timeout=10)
        date_str = response.info().get("Date")
        if date_str:
            real_time = email.utils.parsedate_to_datetime(date_str).timestamp()
            _offset = real_time - time.time()
            print(f"[TIME_PATCH] Clock offset detected: {_offset:.1f}s (~{_offset/3600:.2f} hours)")
            return True
    except Exception as e:
        print(f"[TIME_PATCH] Warning: Could not fetch real time from Google: {e}")
    return False


def apply_time_patch():
    """Apply the time patch globally. Safe to call multiple times."""
    global _patched, _offset, _original_time

    if _patched:
        return

    # Check if patch is needed (offset > 30 seconds)
    if not _fetch_real_time_offset():
        print("[TIME_PATCH] Skipping patch (could not determine offset)")
        return

    if abs(_offset) < 30:
        print("[TIME_PATCH] Clock is accurate (offset < 30s), no patch needed.")
        _patched = True
        return

    print(f"[TIME_PATCH] Applying time correction of {_offset:.1f} seconds...")

    # Save original time.time
    _original_time = time.time

    # 1. Patch time.time()
    def _patched_time():
        return _original_time() + _offset
    time.time = _patched_time

    # 2. Patch google.auth._helpers.utcnow() — this is what Firebase uses for JWT signing
    try:
        from google.auth import _helpers
        def _patched_utcnow():
            corrected_ts = _original_time() + _offset
            now = datetime.datetime.fromtimestamp(corrected_ts, tz=datetime.timezone.utc)
            return now.replace(tzinfo=None)
        _helpers.utcnow = _patched_utcnow
        print("[TIME_PATCH] Patched google.auth._helpers.utcnow()")
    except ImportError:
        print("[TIME_PATCH] google.auth not installed, skipping _helpers patch")

    # 3. Patch google.auth._helpers.utcfromtimestamp() if it exists
    try:
        from google.auth import _helpers as auth_helpers
        _original_utcfromtimestamp = getattr(auth_helpers, 'utcfromtimestamp', None)
        if _original_utcfromtimestamp:
            def _patched_utcfromtimestamp(timestamp):
                return datetime.datetime.utcfromtimestamp(timestamp)
            auth_helpers.utcfromtimestamp = _patched_utcfromtimestamp
    except ImportError:
        pass

    _patched = True
    corrected = _original_time() + _offset
    print(f"[TIME_PATCH] Corrected system time: {time.ctime(corrected)}")
    print("[TIME_PATCH] Time patch applied successfully!")


# Auto-apply when imported
apply_time_patch()
