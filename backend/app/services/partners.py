def calculate_settlement(vouchers: list) -> float:
    """Calculate the total settlement amount from a list of vouchers.

    Vouchers can be dictionaries (from unit tests) or DB objects.
    Rounds the final total to 2 decimal places.
    """
    total = 0.0
    for v in vouchers:
        if isinstance(v, dict):
            total += v.get("discount_amount", 0.0)
        else:
            total += getattr(v, "discount_amount", 0.0)
    return round(total, 2)
