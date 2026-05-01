import re
from datetime import datetime

from config import HR_ZONE_BOUNDARIES, HYROX_KEYWORDS


def _compute_hr_zones(
    hr_list: list[int], time_list: list[int], max_hr: int
) -> dict[str, float]:
    zones = [0.0] * len(HR_ZONE_BOUNDARIES)

    for i in range(len(time_list) - 1):
        dt = time_list[i + 1] - time_list[i]
        pct = hr_list[i] / max_hr

        for zone_idx, (low, high) in enumerate(HR_ZONE_BOUNDARIES):
            if low <= pct < high:
                zones[zone_idx] += dt
                break

    return {
        "z1_s": zones[0],
        "z2_s": zones[1],
        "z3_s": zones[2],
        "z4_s": zones[3],
        "z5_s": zones[4],
    }


def build_record(
    raw: dict, hr_stream: tuple[list[int], list[int]] | None, max_hr: int
) -> dict:
    activity_name: str = raw.get("name", "")

    # Strip "(GMT±HHMM) " prefix from timezone
    timezone_raw: str = raw.get("timezone", "")
    timezone = re.sub(r"^\(GMT[+-]\d{4}\)\s*", "", timezone_raw)

    tags: list[str] = []
    name_lower = activity_name.lower()
    if any(keyword in name_lower for keyword in HYROX_KEYWORDS):
        tags.append("hyrox")

    avg_hr_raw = raw.get("average_heartrate")
    max_hr_bpm_raw = raw.get("max_heartrate")

    if hr_stream is not None:
        hr_zones = _compute_hr_zones(hr_stream[0], hr_stream[1], max_hr)
        hr_zones_computed = True
    else:
        hr_zones = {"z1_s": None, "z2_s": None, "z3_s": None, "z4_s": None, "z5_s": None}
        hr_zones_computed = False

    return {
        "strava_id": raw["id"],
        "source": "strava",
        "activity_type": raw["type"],
        "activity_name": activity_name,
        "start_date_utc": raw["start_date"],
        "start_date_local": raw["start_date_local"],
        "timezone": timezone,
        "elapsed_time_s": raw["elapsed_time"],
        "moving_time_s": raw["moving_time"],
        "distance_m": raw.get("distance"),
        "calories": raw.get("calories"),
        "avg_hr_bpm": int(avg_hr_raw) if avg_hr_raw is not None else None,
        "max_hr_bpm": int(max_hr_bpm_raw) if max_hr_bpm_raw is not None else None,
        "kudos_count": raw.get("kudos_count", 0),
        "trainer": raw.get("trainer", False),
        "commute": raw.get("commute", False),
        "manual": raw.get("manual", False),
        "gear_id": raw.get("gear_id"),
        "max_hr_used": max_hr,
        "tags": tags,
        "hr_zones": hr_zones,
        "hr_zones_computed": hr_zones_computed,
        "exported_at": datetime.utcnow().isoformat() + "Z",
    }
