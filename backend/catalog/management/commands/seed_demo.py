from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from catalog.models import AccountProfile, Product, Store, WholesaleListing
from catalog.recommendations import apply_product_wait_signals


class Command(BaseCommand):
    help = "Seed StockRevive with demo stores and products."

    def handle(self, *args, **options):
        store_specs = [
            ("TechHub Beirut", "Beirut", "Hamra Main Street", "techhub@stockrevive.demo"),
            ("Circuit City", "Jounieh", "Old Souk Road", "circuit@stockrevive.demo"),
            ("Gadget Zone", "Byblos", "Port Avenue", "gadget@stockrevive.demo"),
        ]
        stores = []
        sellers = {}

        for store_name, city, address, email in store_specs:
            store = Store.objects.get_or_create(name=store_name, city=city, address=address)[0]
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    "email": email,
                    "first_name": store_name.split()[0],
                    "last_name": "Store",
                },
            )
            if created:
                user.set_password("DemoStore123!")
                user.save(update_fields=["password"])
            AccountProfile.objects.update_or_create(
                user=user,
                defaults={
                    "account_type": AccountProfile.BUSINESS,
                    "store_name": store_name,
                    "phone": "+961 70 000 000",
                    "city": city,
                    "street_address": address,
                    "building_details": "Main showroom",
                    "business_phone": "+961 70 000 000",
                },
            )
            stores.append(store)
            sellers[store.name] = user

        products = [
            ("Intel Core i7-14700K", "CPUs", Decimal("379.00"), stores[0], "in_stock", True, True, 0, 5, "new"),
            ("Intel Core i7-14700K", "CPUs", Decimal("389.00"), stores[1], "in_stock", True, False, 0, 3, "new"),
            ("Intel Core i7-14700K", "CPUs", Decimal("409.00"), stores[2], "low_stock", False, False, 0, 2, "open_box"),
            ("AMD Ryzen 7 7800X3D", "CPUs", Decimal("349.00"), stores[0], "in_stock", True, True, 0, 4, "new"),
            ("NVIDIA RTX 4070 Super", "GPUs", Decimal("599.00"), stores[1], "low_stock", True, True, 0, 2, "open_box"),
            ("ASUS B650E-F Motherboard", "Motherboards", Decimal("249.00"), stores[2], "in_stock", False, True, 10, 8, "new"),
            ("Corsair Vengeance 32GB DDR5", "RAM", Decimal("129.00"), stores[0], "in_stock", False, True, 0, 7, "new"),
            ("Samsung 990 Pro 2TB NVMe", "Storage", Decimal("172.00"), stores[0], "in_stock", False, False, 10, 6, "new"),
            ("Samsung 990 Pro 2TB NVMe", "Storage", Decimal("169.00"), stores[1], "in_stock", False, False, 8, 9, "new"),
            ("Samsung 990 Pro 2TB NVMe", "Storage", Decimal("166.00"), stores[2], "in_stock", False, False, 12, 5, "new"),
            ("Cooler Master 850W Gold PSU", "Power Supplies", Decimal("139.00"), stores[2], "low_stock", False, False, 0, 2, "refurbished"),
        ]

        old_demo_names = [
            "MacBook Air M3",
            "Sony WH-1000XM5",
            "Samsung Galaxy S25",
            "Logitech MX Master 3S",
            "Dell UltraSharp 27",
            "iPad Pro 11",
        ]
        Product.objects.filter(name__in=old_demo_names).delete()

        for name, category, price, store, stock, trending, recommended, discount, quantity, condition in products:
            product, _ = Product.objects.update_or_create(
                name=name,
                store=store,
                defaults={
                    "category": category,
                    "price": price,
                    "quantity": quantity,
                    "condition": condition,
                    "stock_status": stock,
                    "seller": sellers[store.name],
                    "seller_name": store.name,
                    "seller_phone": "+961 70 000 000",
                    "store_count": 1,
                    "distance_miles": Decimal("1.0"),
                    "is_trending": trending,
                    "is_recommended": recommended,
                    "discount_percent": discount,
                },
            )
            apply_product_wait_signals(product)
            product.save(update_fields=["wait_status", "demand_label", "updated_at"])

        wholesale_products = [
            ("Intel Core i7-14700K Bulk Tray", "CPUs", Decimal("330.00"), stores[0], 45, 10, "low", "high", True),
            ("NVIDIA RTX 4070 Super Case Pack", "GPUs", Decimal("535.00"), stores[0], 22, 5, "low", "high", True),
            ("NVIDIA RTX 4070 Super Case Pack", "GPUs", Decimal("540.00"), stores[1], 18, 5, "critical", "high", True),
            ("NVIDIA RTX 4070 Super Case Pack", "GPUs", Decimal("795.00"), stores[2], 16, 5, "low", "high", False),
            ("ASUS B650E-F Motherboard Batch", "Motherboards", Decimal("205.00"), stores[2], 64, 8, "available", "medium", False),
            ("Corsair Vengeance 32GB DDR5 Kit", "RAM", Decimal("98.00"), stores[0], 120, 12, "available", "medium", False),
            ("Corsair Vengeance 32GB DDR5 Kit", "RAM", Decimal("101.00"), stores[1], 88, 10, "available", "medium", False),
            ("Corsair Vengeance 32GB DDR5 Kit", "RAM", Decimal("58.00"), stores[2], 94, 10, "available", "medium", True),
            ("Samsung 990 Pro 2TB NVMe Bulk", "Storage", Decimal("138.00"), stores[1], 32, 10, "low", "high", True),
            ("Cooler Master 850W Gold PSU Lot", "Power Supplies", Decimal("105.00"), stores[2], 8, 4, "critical", "high", False),
        ]

        for name, category, price, store, units, min_order, stock_status, demand_level, trending in wholesale_products:
            WholesaleListing.objects.update_or_create(
                product_name=name,
                store=store,
                defaults={
                    "category": category,
                    "description": "Bulk inventory available for verified StockRevive partner stores.",
                    "wholesale_price": price,
                    "available_units": units,
                    "min_order_quantity": min_order,
                    "city": store.city,
                    "distance_miles": Decimal("1.0"),
                    "stock_status": stock_status,
                    "demand_level": demand_level,
                    "is_trending": trending,
                    "seller": sellers[store.name],
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded demo StockRevive data."))
