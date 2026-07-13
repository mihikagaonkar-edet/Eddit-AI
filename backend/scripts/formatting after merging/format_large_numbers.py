"""
Convert raw numbers into abbreviated millions/billions strings, e.g.
10000000 -> "10M", 1250000000 -> "1.3B".

Formatting rules (matching the convention already used for "Albums sold",
"Singles sold", "Spotify listeners", and "Youtube views" columns in
data/*.csv):
  - numbers below 1,000,000 are left as a plain integer string
  - numbers in the millions/billions are rounded to 1 decimal place and
    suffixed "M"/"B", dropping a trailing ".0" (e.g. "2.0B" -> "2B")

Usage as a CLI, pass one or more raw numbers:
    python scripts/format_large_numbers.py 10000000 1250000000 999
    -> 10M
       1.3B
       999

Or import the function directly:
    from format_large_numbers import format_number
    format_number(10000000)  # "10M"
"""

import sys

MILLION = 1_000_000
BILLION = 1_000_000_000


def _format_scaled(n: float, unit: float, suffix: str) -> str:
    scaled = n / unit
    s = f"{scaled:.1f}{suffix}"
    if s.endswith(f".0{suffix}"):
        s = s[: -len(f".0{suffix}")] + suffix
    return s


def format_number(n: float) -> str:
    n = float(n)

    if n >= BILLION:
        return _format_scaled(n, BILLION, "B")

    if n >= MILLION:
        return _format_scaled(n, MILLION, "M")

    return str(int(n)) if n == int(n) else str(n)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/format_large_numbers.py <number> [<number> ...]")
        sys.exit(1)

    for arg in sys.argv[1:]:
        try:
            n = float(arg.replace(",", ""))
        except ValueError:
            print(f"{arg}: not a number")
            continue
        print(format_number(n))


if __name__ == "__main__":
    main()
