import time

import requests

from config import STRAVA_API_BASE

# Module-level rate limit tracker shared across all request types
_rate_limit_usage: int = 0
_rate_limit_limit: int = 600  # Strava default 15-min limit


def _check_rate_limit(response: requests.Response) -> None:
    global _rate_limit_usage, _rate_limit_limit

    limit_header = response.headers.get("X-RateLimit-Limit")
    usage_header = response.headers.get("X-RateLimit-Usage")

    if limit_header and usage_header:
        # Headers may be comma-separated "15min,daily" — take the first (15-min) value
        _rate_limit_limit = int(limit_header.split(",")[0])
        _rate_limit_usage = int(usage_header.split(",")[0])

        if _rate_limit_limit - _rate_limit_usage < 10:
            time.sleep(900)


def _get(token: str, path: str, params: dict | None = None) -> requests.Response:
    url = f"{STRAVA_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers, params=params)
    _check_rate_limit(response)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 60))
        time.sleep(retry_after)
        response = requests.get(url, headers=headers, params=params)
        _check_rate_limit(response)

    if not response.ok:
        raise RuntimeError(
            f"Strava API error [{response.status_code}] {path}: {response.text[:200]}"
        )

    return response


def fetch_activities(
    token: str, after_epoch: int | None, limit: int | None = None
) -> list[dict]:
    all_activities: list[dict] = []
    page = 1

    while True:
        per_page = min(100, limit - len(all_activities)) if limit else 100
        params: dict = {"per_page": per_page, "page": page}
        if after_epoch is not None:
            params["after"] = after_epoch

        response = _get(token, "/athlete/activities", params)
        page_data: list[dict] = response.json()

        all_activities.extend(page_data)

        if len(page_data) < per_page or (limit and len(all_activities) >= limit):
            break

        page += 1

    return all_activities[:limit] if limit else all_activities


def fetch_hr_stream(
    token: str, activity_id: int
) -> tuple[list[int], list[int]] | None:
    path = f"/activities/{activity_id}/streams"
    params = {
        "keys": "heartrate,time",
        "key_by_type": "true",
        "resolution": "high",
    }

    url = f"{STRAVA_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers, params=params)
    _check_rate_limit(response)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 60))
        time.sleep(retry_after)
        response = requests.get(url, headers=headers, params=params)
        _check_rate_limit(response)

    if response.status_code == 404:
        return None

    if not response.ok:
        raise RuntimeError(
            f"Strava API error [{response.status_code}] {path}: {response.text[:200]}"
        )

    data: dict = response.json()

    if "heartrate" not in data:
        return None

    heartrate: list[int] = data["heartrate"]["data"]
    time_list: list[int] = data["time"]["data"]

    return heartrate, time_list
