def format_artist_name(name: str) -> str:
    """Capitalize the first letter of each word in an artist name."""
    if not name:
        return name
    return " ".join(
        word[:1].upper() + word[1:].lower() if word else word for word in name.split()
    )
