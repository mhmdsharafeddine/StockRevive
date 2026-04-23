from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework import serializers

from .models import AccountProfile, ListingRequest, Notification, Product, StockItem, Store, WholesaleListing, WholesaleOrder


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ["id", "name", "city", "address", "rating"]


class StockItemSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    condition_label = serializers.CharField(source="get_condition_display", read_only=True)

    class Meta:
        model = StockItem
        fields = [
            "id",
            "sku",
            "product_name",
            "category",
            "quantity",
            "unit_cost",
            "suggested_retail_price",
            "suggested_wholesale_price",
            "min_order_quantity",
            "condition",
            "condition_label",
            "depot_location",
            "description",
            "source_file",
            "store",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProductSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    stock_label = serializers.CharField(source="get_stock_status_display", read_only=True)
    wait_label = serializers.CharField(source="get_wait_status_display", read_only=True)
    condition_label = serializers.CharField(source="get_condition_display", read_only=True)
    photo_url = serializers.SerializerMethodField()
    store_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    store_city = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "description",
            "price",
            "quantity",
            "condition",
            "condition_label",
            "image_url",
            "image",
            "photo_url",
            "stock_status",
            "stock_label",
            "wait_status",
            "wait_label",
            "rating",
            "distance_miles",
            "store_count",
            "demand_label",
            "seller",
            "store",
            "seller_name",
            "seller_phone",
            "store_name",
            "store_city",
            "is_trending",
            "is_recommended",
            "discount_percent",
            "updated_at",
        ]
        read_only_fields = ["seller", "updated_at"]

    def get_photo_url(self, product):
        request = self.context.get("request")

        if product.image:
            url = product.image.url
            return request.build_absolute_uri(url) if request else url

        return product.image_url

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        if not user or not user.is_authenticated:
            raise serializers.ValidationError({"detail": "You must be logged in with a business account to create a listing."})

        profile = getattr(user, "profile", None)
        if not profile or profile.account_type != AccountProfile.BUSINESS:
            raise serializers.ValidationError({"detail": "Only business accounts can create marketplace listings."})

        store_name = profile.store_name.strip()
        store_city = validated_data.pop("store_city", "").strip() or "Beirut"

        if not store_name:
            raise serializers.ValidationError({"detail": "Your business account needs a store name before listing products."})

        store, _ = Store.objects.get_or_create(
            name=store_name,
            defaults={"city": store_city, "address": "", "rating": validated_data.get("rating", 4.8)},
        )
        validated_data["store"] = store
        validated_data["seller"] = user
        validated_data["seller_name"] = store_name
        validated_data["seller_phone"] = profile.business_phone or profile.phone
        return super().create(validated_data)

    def update(self, instance, validated_data):
        store_city = validated_data.pop("store_city", "").strip()
        if store_city:
            instance.store.city = store_city
            instance.store.save(update_fields=["city"])
        return super().update(instance, validated_data)


class AccountProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountProfile
        fields = [
            "account_type",
            "store_name",
            "phone",
            "city",
            "street_address",
            "building_details",
            "business_phone",
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = AccountProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "profile"]

    def get_full_name(self, user):
        return user.get_full_name() or user.email


class AccountSettingsSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40)
    city = serializers.CharField(max_length=100)
    street_address = serializers.CharField(max_length=255)
    building_details = serializers.CharField(max_length=160, required=False, allow_blank=True)
    store_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    business_phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.lower().strip()
        user = self.context["request"].user

        if User.objects.exclude(pk=user.pk).filter(email=email).exists() or User.objects.exclude(pk=user.pk).filter(username=email).exists():
            raise serializers.ValidationError("Another account is already using this email.")

        return email

    def validate(self, attrs):
        user = self.context["request"].user
        profile = user.profile

        if not attrs.get("full_name", "").strip():
            raise serializers.ValidationError({"full_name": "Full name is required."})
        if not attrs.get("phone", "").strip():
            raise serializers.ValidationError({"phone": "Phone number is required."})
        if not attrs.get("city", "").strip():
            raise serializers.ValidationError({"city": "City is required."})
        if not attrs.get("street_address", "").strip():
            raise serializers.ValidationError({"street_address": "Street address is required."})
        if profile.account_type == AccountProfile.BUSINESS and not attrs.get("store_name", "").strip():
            raise serializers.ValidationError({"store_name": "Store name is required for business accounts."})

        return attrs

    @transaction.atomic
    def update(self, user, validated_data):
        full_name = validated_data["full_name"].strip()
        name_parts = full_name.split(maxsplit=1)
        user.first_name = name_parts[0]
        user.last_name = name_parts[1] if len(name_parts) > 1 else ""
        user.email = validated_data["email"]
        user.username = validated_data["email"]
        user.save(update_fields=["first_name", "last_name", "email", "username"])

        profile = user.profile
        profile.phone = validated_data.get("phone", "").strip()
        profile.city = validated_data.get("city", "").strip()
        profile.street_address = validated_data.get("street_address", "").strip()
        profile.building_details = validated_data.get("building_details", "").strip()
        profile.business_phone = validated_data.get("business_phone", "").strip() or profile.phone

        if profile.account_type == AccountProfile.BUSINESS:
            profile.store_name = validated_data.get("store_name", "").strip()
            Store.objects.filter(products__seller=user).update(
                name=profile.store_name,
                city=profile.city,
                address=profile.street_address,
            )
            Product.objects.filter(seller=user).update(
                seller_name=profile.store_name,
                seller_phone=profile.business_phone,
            )

        profile.save(
            update_fields=[
                "phone",
                "city",
                "street_address",
                "building_details",
                "business_phone",
                "store_name",
            ]
        )
        return user


class ListingRequestSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    requester_name = serializers.SerializerMethodField()
    request_type_label = serializers.CharField(source="get_request_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ListingRequest
        fields = [
            "id",
            "product",
            "product_name",
            "store_name",
            "requester_name",
            "request_type",
            "request_type_label",
            "status",
            "status_label",
            "message",
            "created_at",
            "completed_at",
            "canceled_at",
        ]
        read_only_fields = fields

    def get_requester_name(self, request_record):
        return request_record.requester.get_full_name() or request_record.requester.email


class OrderSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    request_type_label = serializers.CharField(source="get_request_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    buyer = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    transaction_fee = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    marketplace = serializers.SerializerMethodField()
    order_key = serializers.SerializerMethodField()

    class Meta:
        model = ListingRequest
        fields = [
            "id",
            "order_key",
            "marketplace",
            "product",
            "product_name",
            "store_name",
            "request_type",
            "request_type_label",
            "status",
            "status_label",
            "buyer",
            "seller",
            "subtotal",
            "transaction_fee",
            "total",
            "message",
            "created_at",
            "completed_at",
            "canceled_at",
        ]

    def get_marketplace(self, order):
        return "retail"

    def get_order_key(self, order):
        return f"retail-{order.id}"

    def get_buyer(self, order):
        profile = getattr(order.requester, "profile", None)
        return self.get_party(order.requester, profile)

    def get_seller(self, order):
        profile = getattr(order.seller, "profile", None) if order.seller else None
        return self.get_party(order.seller, profile, store=order.store)

    def get_party(self, user, profile, store=None):
        if not user:
            return {
                "name": store.name if store else "Unknown",
                "email": "",
                "phone": "",
                "city": store.city if store else "",
                "street_address": store.address if store else "",
                "building_details": "",
            }

        phone = profile.business_phone or profile.phone if profile else ""
        return {
            "name": profile.store_name if profile and profile.account_type == AccountProfile.BUSINESS and profile.store_name else user.get_full_name() or user.email,
            "email": user.email,
            "phone": phone,
            "city": profile.city if profile and profile.city else store.city if store else "",
            "street_address": profile.street_address if profile and profile.street_address else store.address if store else "",
            "building_details": profile.building_details if profile else "",
        }

    def get_subtotal(self, order):
        return order.product.price

    def get_transaction_fee(self, order):
        return round(order.product.price * Decimal("0.13"), 2)

    def get_total(self, order):
        return round(order.product.price * Decimal("1.13"), 2)


class NotificationSerializer(serializers.ModelSerializer):
    listing_request = ListingRequestSerializer(read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "is_read",
            "actor_name",
            "listing_request",
            "created_at",
        ]

    def get_actor_name(self, notification):
        if not notification.actor:
            return ""
        return notification.actor.get_full_name() or notification.actor.email


class WholesaleListingSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    stock_status_label = serializers.CharField(source="get_stock_status_display", read_only=True)
    demand_label = serializers.CharField(source="get_demand_level_display", read_only=True)

    class Meta:
        model = WholesaleListing
        fields = [
            "id",
            "product_name",
            "category",
            "description",
            "wholesale_price",
            "available_units",
            "min_order_quantity",
            "city",
            "distance_miles",
            "stock_status",
            "stock_status_label",
            "demand_level",
            "demand_label",
            "is_trending",
            "store",
            "seller",
            "updated_at",
        ]
        read_only_fields = ["seller", "store", "updated_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        profile = getattr(user, "profile", None)

        if not user or not user.is_authenticated or not profile or profile.account_type != AccountProfile.BUSINESS:
            raise serializers.ValidationError({"detail": "Only business accounts can create wholesale listings."})

        store, _ = Store.objects.get_or_create(
            name=profile.store_name,
            defaults={
                "city": profile.city or validated_data.get("city", "Beirut"),
                "address": profile.street_address,
            },
        )
        validated_data["store"] = store
        validated_data["seller"] = user
        validated_data["city"] = validated_data.get("city") or store.city
        return super().create(validated_data)


class WholesaleOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="listing.product_name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    request_type_label = serializers.CharField(source="get_request_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    product = serializers.SerializerMethodField()
    buyer = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    transaction_fee = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    marketplace = serializers.SerializerMethodField()
    order_key = serializers.SerializerMethodField()

    class Meta:
        model = WholesaleOrder
        fields = [
            "id",
            "order_key",
            "marketplace",
            "product",
            "product_name",
            "store_name",
            "request_type",
            "request_type_label",
            "status",
            "status_label",
            "buyer",
            "seller",
            "quantity",
            "offer_price",
            "subtotal",
            "transaction_fee",
            "total",
            "message",
            "created_at",
            "completed_at",
            "canceled_at",
        ]

    def get_marketplace(self, order):
        return "wholesale"

    def get_order_key(self, order):
        return f"wholesale-{order.id}"

    def get_product(self, order):
        return {
            "id": order.listing.id,
            "name": order.listing.product_name,
            "category": order.listing.category,
            "condition_label": "Bulk inventory",
            "quantity": order.listing.available_units,
        }

    def get_buyer(self, order):
        profile = getattr(order.requester, "profile", None)
        return self.get_party(order.requester, profile)

    def get_seller(self, order):
        profile = getattr(order.seller, "profile", None) if order.seller else None
        return self.get_party(order.seller, profile, store=order.store)

    def get_party(self, user, profile, store=None):
        if not user:
            return {
                "name": store.name if store else "Unknown",
                "email": "",
                "phone": "",
                "city": store.city if store else "",
                "street_address": store.address if store else "",
                "building_details": "",
            }

        phone = profile.business_phone or profile.phone if profile else ""
        return {
            "name": profile.store_name if profile and profile.account_type == AccountProfile.BUSINESS and profile.store_name else user.get_full_name() or user.email,
            "email": user.email,
            "phone": phone,
            "city": profile.city if profile and profile.city else store.city if store else "",
            "street_address": profile.street_address if profile and profile.street_address else store.address if store else "",
            "building_details": profile.building_details if profile else "",
        }

    def get_subtotal(self, order):
        return round(order.unit_price * order.quantity, 2)

    def get_transaction_fee(self, order):
        return round(self.get_subtotal(order) * Decimal("0.13"), 2)

    def get_total(self, order):
        return round(self.get_subtotal(order) * Decimal("1.13"), 2)


class MyListingSerializer(ProductSerializer):
    requests_count = serializers.SerializerMethodField()
    pending_requests_count = serializers.SerializerMethodField()
    recent_requests = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + [
            "requests_count",
            "pending_requests_count",
            "recent_requests",
        ]

    def get_requests_count(self, product):
        return product.listing_requests.count()

    def get_pending_requests_count(self, product):
        return product.listing_requests.filter(status=ListingRequest.PENDING).count()

    def get_recent_requests(self, product):
        requests = product.listing_requests.select_related("requester", "store").order_by("-created_at")[:5]
        return ListingRequestSerializer(requests, many=True).data


class MyWholesaleListingSerializer(WholesaleListingSerializer):
    orders_count = serializers.SerializerMethodField()
    pending_orders_count = serializers.SerializerMethodField()
    recent_orders = serializers.SerializerMethodField()

    class Meta(WholesaleListingSerializer.Meta):
        fields = WholesaleListingSerializer.Meta.fields + [
            "orders_count",
            "pending_orders_count",
            "recent_orders",
        ]

    def get_orders_count(self, listing):
        return listing.orders.count()

    def get_pending_orders_count(self, listing):
        return listing.orders.filter(status=WholesaleOrder.PENDING).count()

    def get_recent_orders(self, listing):
        orders = listing.orders.select_related(
            "listing__store",
            "requester__profile",
            "seller__profile",
            "store",
        ).order_by("-created_at")[:5]
        return WholesaleOrderSerializer(orders, many=True, context=self.context).data


class RegisterSerializer(serializers.Serializer):
    ACCOUNT_TYPES = [AccountProfile.CUSTOMER, AccountProfile.BUSINESS]

    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    account_type = serializers.ChoiceField(choices=ACCOUNT_TYPES)
    phone = serializers.CharField(max_length=40)
    city = serializers.CharField(max_length=100)
    street_address = serializers.CharField(max_length=255)
    building_details = serializers.CharField(max_length=160, required=False, allow_blank=True)
    store_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    business_phone = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        validate_password(attrs["password"])

        if not attrs.get("phone", "").strip():
            raise serializers.ValidationError({"phone": "Phone number is required."})
        if not attrs.get("city", "").strip():
            raise serializers.ValidationError({"city": "City is required."})
        if not attrs.get("street_address", "").strip():
            raise serializers.ValidationError({"street_address": "Street address is required."})

        if attrs["account_type"] == AccountProfile.BUSINESS:
            if not attrs.get("store_name", "").strip():
                raise serializers.ValidationError({"store_name": "Store name is required for business accounts."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        full_name = validated_data["full_name"].strip()
        name_parts = full_name.split(maxsplit=1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
        )
        AccountProfile.objects.create(
            user=user,
            account_type=validated_data["account_type"],
            store_name=validated_data.get("store_name", "").strip(),
            phone=validated_data.get("phone", "").strip(),
            city=validated_data.get("city", "").strip(),
            street_address=validated_data.get("street_address", "").strip(),
            building_details=validated_data.get("building_details", "").strip(),
            business_phone=validated_data.get("business_phone", "").strip() or validated_data.get("phone", "").strip(),
        )
        Token.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        user = authenticate(username=email, password=attrs["password"])

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = user
        return attrs
