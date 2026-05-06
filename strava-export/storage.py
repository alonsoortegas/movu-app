import json
import os


def load_existing_ids(output_file: str) -> set[int]:
    ids: set[int] = set()

    if not os.path.exists(output_file):
        return ids

    with open(output_file) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                strava_id = record.get("strava_id")
                if strava_id is not None:
                    ids.add(int(strava_id))
            except json.JSONDecodeError:
                continue

    return ids


def append_records(
    records: list[dict], output_file: str, existing_ids: set[int]
) -> tuple[int, int]:
    new_count = 0
    skipped_count = 0

    with open(output_file, "a") as f:
        for record in records:
            strava_id = record["strava_id"]
            if strava_id in existing_ids:
                skipped_count += 1
                continue
            f.write(json.dumps(record) + "\n")
            existing_ids.add(strava_id)
            new_count += 1

    return new_count, skipped_count


def load_state(state_file: str) -> dict:
    if not os.path.exists(state_file):
        return {"last_sync_utc": None, "total_exported": 0}

    with open(state_file) as f:
        return json.load(f)


def save_state(state_file: str, last_sync_utc: str, total_exported: int) -> None:
    with open(state_file, "w") as f:
        json.dump(
            {"last_sync_utc": last_sync_utc, "total_exported": total_exported},
            f,
            indent=2,
        )
