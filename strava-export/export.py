#!/usr/bin/env python3
"""Strava workout export CLI — fetches activities and writes JSONL."""

import argparse
import sys
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

import auth
import client
import storage
import transform
from config import BATCH_SIZE, DEFAULT_MAX_HR, DEFAULT_OUTPUT_FILE, STATE_FILE


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export Strava workout data to JSONL."
    )
    parser.add_argument(
        "--since",
        metavar="DATE",
        help="ISO date string (e.g. 2024-01-01) — fetch activities after this date, overrides saved state.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Ignore saved state and fetch all activities.",
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        default=DEFAULT_OUTPUT_FILE,
        help=f"Output JSONL file path (default: {DEFAULT_OUTPUT_FILE}).",
    )
    parser.add_argument(
        "--max-hr",
        metavar="INT",
        type=int,
        default=DEFAULT_MAX_HR,
        help=f"Max heart rate for zone computation (default: {DEFAULT_MAX_HR}).",
    )
    parser.add_argument(
        "--limit",
        metavar="N",
        type=int,
        default=None,
        help="Only fetch the N most recent activities (useful for testing).",
    )
    parser.add_argument(
        "--last-days",
        metavar="N",
        type=int,
        default=None,
        help="Fetch activities from the last N days (e.g. --last-days 7).",
    )
    return parser.parse_args()


def _resolve_after_epoch(
    args: argparse.Namespace, state: dict
) -> int | None:
    if args.full:
        return None

    if args.last_days:
        dt = datetime.now(tz=timezone.utc) - timedelta(days=args.last_days)
        return int(dt.timestamp())

    if args.since:
        dt = datetime.fromisoformat(args.since).replace(tzinfo=timezone.utc)
        return int(dt.timestamp())

    last_sync = state.get("last_sync_utc")
    if last_sync:
        dt = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
        return int(dt.timestamp())

    return None


def main() -> None:
    load_dotenv()
    args = _parse_args()

    output_file: str = args.output
    max_hr: int = args.max_hr

    print("Authenticating with Strava...")
    token = auth.get_valid_token()
    print("Token OK.")

    state = storage.load_state(STATE_FILE)
    after_epoch = _resolve_after_epoch(args, state)

    if after_epoch is not None:
        after_dt = datetime.fromtimestamp(after_epoch, tz=timezone.utc).isoformat()
        print(f"Fetching activities after: {after_dt}")
    else:
        print("Fetching all activities (full sync).")

    existing_ids = storage.load_existing_ids(output_file)
    print(f"Loaded {len(existing_ids)} existing IDs from {output_file}.")

    print("Downloading activity list from Strava...")
    all_activities = client.fetch_activities(token, after_epoch, limit=args.limit)
    total_activities = len(all_activities)
    print(f"Found {total_activities} activities to process.")

    if total_activities == 0:
        print("Nothing to export.")
        _finalize_state(args, state, output_file, 0)
        return

    run_start_utc = datetime.utcnow().isoformat() + "Z"
    total_fetched = 0
    total_new = 0
    total_skipped = 0
    batch: list[dict] = []

    try:
        for activity in all_activities:
            activity_id: int = activity["id"]
            hr_stream = client.fetch_hr_stream(token, activity_id)
            record = transform.build_record(activity, hr_stream, max_hr)
            batch.append(record)
            total_fetched += 1

            if len(batch) >= BATCH_SIZE:
                new_count, skipped_count = storage.append_records(
                    batch, output_file, existing_ids
                )
                total_new += new_count
                total_skipped += skipped_count
                batch = []

                storage.save_state(STATE_FILE, run_start_utc, total_new)
                print(
                    f"  {total_fetched} fetched, {total_new} new, {total_skipped} skipped"
                )

        # Flush remaining records
        if batch:
            new_count, skipped_count = storage.append_records(
                batch, output_file, existing_ids
            )
            total_new += new_count
            total_skipped += skipped_count
            storage.save_state(STATE_FILE, run_start_utc, total_new)
            print(
                f"  {total_fetched} fetched, {total_new} new, {total_skipped} skipped"
            )

    except KeyboardInterrupt:
        print("\nInterrupted — progress saved.")
        sys.exit(0)

    _finalize_state(args, state, output_file, total_new, run_start_utc)

    print(
        f"\nDone. {total_fetched} activities processed: "
        f"{total_new} new, {total_skipped} skipped."
    )
    print(f"Output: {output_file}")


def _finalize_state(
    args: argparse.Namespace,
    state: dict,
    output_file: str,
    total_new: int,
    run_start_utc: str | None = None,
) -> None:
    """Update sync state on successful completion."""
    if run_start_utc is None:
        run_start_utc = datetime.utcnow().isoformat() + "Z"

    previous_total = state.get("total_exported", 0)

    # --since and --full always overwrite the sync cursor
    if args.full or args.since:
        storage.save_state(STATE_FILE, run_start_utc, previous_total + total_new)
    else:
        storage.save_state(STATE_FILE, run_start_utc, previous_total + total_new)


if __name__ == "__main__":
    main()
