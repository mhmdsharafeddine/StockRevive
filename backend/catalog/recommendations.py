from types import SimpleNamespace

from .models import Product, WholesaleListing


def apply_product_wait_signals(product):
    quantity = max(int(product.quantity or 0), 0)
    discount = int(product.discount_percent or 0)
    store_count = max(int(product.store_count or 1), 1)
    is_hot = bool(product.is_trending or product.is_recommended)

    if quantity <= 2 or (is_hot and quantity <= 5) or (store_count == 1 and quantity <= 3):
        product.wait_status = Product.BUY_NOW
        product.demand_label = "Demand rising, supply is tight"
        return product

    if discount >= 8 or (not is_hot and quantity >= 8) or (store_count >= 3 and quantity >= 12):
        product.wait_status = Product.PRICE_DROP
        product.demand_label = "Supply is healthy and demand is cooling"
        return product

    product.wait_status = Product.WORTH_WAITING
    product.demand_label = "Demand is steady with stable availability"
    return product


def get_product_wait_context(product):
    wait_status = getattr(product, "wait_status", Product.BUY_NOW)
    quantity = max(int(getattr(product, "quantity", 0) or 0), 0)
    store_count = max(int(getattr(product, "store_count", 1) or 1), 1)
    demand_label = getattr(product, "demand_label", "").strip()

    if wait_status == Product.BUY_NOW:
        if quantity <= 2:
            reason = "Availability is limited right now."
        elif getattr(product, "is_trending", False):
            reason = "Demand is climbing faster than supply."
        else:
            reason = "This item may get harder to find soon."
        return {
            "wait_tone": "urgent",
            "wait_message": "Buy now. Demand is expected to rise or stock is too limited to wait safely.",
            "wait_reason": reason,
            "demand_label": demand_label or "Demand rising, supply is tight",
        }

    if wait_status == Product.PRICE_DROP:
        if store_count >= 3:
            reason = "Several stores still have competing inventory."
        elif quantity >= 8:
            reason = "Supply is healthy and sellers may need to move stock."
        else:
            reason = "Demand looks softer than current supply."
        return {
            "wait_tone": "calm",
            "wait_message": "Waiting could pay off. Demand looks softer, so better deals may appear soon.",
            "wait_reason": reason,
            "demand_label": demand_label or "Supply is healthy and demand is cooling",
        }

    return {
        "wait_tone": "steady",
        "wait_message": "Worth waiting. Availability looks stable, so there is no strong rush to buy today.",
        "wait_reason": "Stock looks balanced with current demand.",
        "demand_label": demand_label or "Demand is steady with stable availability",
    }


def summarize_product_market(products):
    offers = list(products)
    total_quantity = sum(max(int(getattr(product, "quantity", 0) or 0), 0) for product in offers)
    store_count = len(offers) or 1
    trending_count = sum(1 for product in offers if getattr(product, "is_trending", False) or getattr(product, "is_recommended", False))
    discount_count = sum(1 for product in offers if int(getattr(product, "discount_percent", 0) or 0) >= 8)
    if total_quantity <= 3:
        status = Product.BUY_NOW
        context = {
            "wait_tone": "urgent",
            "wait_message": "Buy now. Demand is expected to rise or stock is too limited to wait safely.",
            "wait_reason": "Availability is limited right now.",
            "demand_label": "Demand rising, supply is tight",
        }
    elif store_count >= 3 and total_quantity >= 6:
        if discount_count > 0 and total_quantity >= 8:
            status = Product.PRICE_DROP
            context = {
                "wait_tone": "calm",
                "wait_message": "Waiting could pay off. Demand looks softer, so better deals may appear soon.",
                "wait_reason": "Several stores still have competing inventory.",
                "demand_label": "Supply is healthy and demand is cooling",
            }
        else:
            status = Product.WORTH_WAITING
            context = {
                "wait_tone": "steady",
                "wait_message": "Worth waiting. Availability looks stable, so there is no strong rush to buy today.",
                "wait_reason": "Supply looks balanced across multiple stores.",
                "demand_label": "Demand is steady with stable availability",
            }
    else:
        snapshot = SimpleNamespace(
            quantity=total_quantity,
            store_count=store_count,
            is_trending=trending_count > 0,
            is_recommended=trending_count > 1,
            discount_percent=10 if discount_count else 0,
            wait_status=Product.WORTH_WAITING,
            demand_label="",
        )
        apply_product_wait_signals(snapshot)
        status = snapshot.wait_status
        context = get_product_wait_context(snapshot)

    context.update(
        {
            "wait_status": status,
            "wait_label": dict(Product.WAIT_STATUS_CHOICES)[status],
            "offer_count": store_count,
            "total_quantity": total_quantity,
        }
    )
    return context


def get_product_seller_context(product):
    score = 0
    quantity = max(int(getattr(product, "quantity", 0) or 0), 0)
    wait_status = getattr(product, "wait_status", Product.BUY_NOW)

    if getattr(product, "is_trending", False):
        score += 2
    if quantity <= 2:
        score += 1
    if wait_status == Product.BUY_NOW:
        score += 1
    if wait_status == Product.PRICE_DROP:
        score -= 2
    if quantity >= 8:
        score -= 1
    if int(getattr(product, "discount_percent", 0) or 0) >= 8:
        score -= 1

    if score >= 1:
        return {
            "seller_recommendation": "hold",
            "seller_recommendation_label": "Hold Inventory",
            "seller_recommendation_tone": "hold",
            "seller_recommendation_message": "Demand looks strong enough to hold a bit longer and sell into tighter supply.",
        }

    return {
        "seller_recommendation": "sell_now",
        "seller_recommendation_label": "Sell Earlier",
        "seller_recommendation_tone": "sell",
        "seller_recommendation_message": "Demand looks softer than supply, so selling earlier reduces the risk of markdowns later.",
    }


def get_wholesale_seller_context(listing):
    score = 0
    available_units = max(int(getattr(listing, "available_units", 0) or 0), 0)
    demand_level = getattr(listing, "demand_level", WholesaleListing.DEMAND_MEDIUM)
    stock_status = getattr(listing, "stock_status", WholesaleListing.STOCK_AVAILABLE)

    if demand_level == WholesaleListing.DEMAND_HIGH:
        score += 2
    elif demand_level == WholesaleListing.DEMAND_LOW:
        score -= 2

    if getattr(listing, "is_trending", False):
        score += 1
    if stock_status == WholesaleListing.STOCK_CRITICAL:
        score += 1
    elif stock_status == WholesaleListing.STOCK_AVAILABLE and available_units >= 40:
        score -= 1

    if available_units >= 80:
        score -= 1
    elif available_units <= 12:
        score += 1

    if score >= 2:
        return {
            "seller_recommendation": "hold",
            "seller_recommendation_label": "Hold Inventory",
            "seller_recommendation_tone": "hold",
            "seller_recommendation_message": "Demand is expected to improve, so holding inventory could support better wholesale terms.",
        }

    return {
        "seller_recommendation": "sell_now",
        "seller_recommendation_label": "Sell Earlier",
        "seller_recommendation_tone": "sell",
        "seller_recommendation_message": "Demand looks flatter than supply, so moving units earlier helps avoid weaker pricing later.",
    }
