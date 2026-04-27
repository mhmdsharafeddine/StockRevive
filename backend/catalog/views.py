import csv
import io
import zipfile
from datetime import date
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree

from django.contrib.auth import login, logout
from django.db import transaction
from django.db.models import Min, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FileUploadParser, FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import AccountProfile, ListingRequest, Notification, Product, StockItem, Store, WholesaleListing, WholesaleOrder
from .recommendations import apply_product_wait_signals, summarize_product_market
from .serializers import (
    AccountSettingsSerializer,
    ListingRequestSerializer,
    LoginSerializer,
    MyListingSerializer,
    MyWholesaleListingSerializer,
    NotificationSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    StoreSerializer,
    StockItemSerializer,
    UserSerializer,
    WholesaleListingSerializer,
    WholesaleOrderSerializer,
)


def sync_product_stock_status(product):
    if product.quantity == 0:
        product.stock_status = Product.STOCK_OUT
    elif product.quantity <= 2:
        product.stock_status = Product.STOCK_LOW
    else:
        product.stock_status = Product.STOCK_HIGH
    apply_product_wait_signals(product)


def sync_wholesale_stock_status(listing):
    if listing.available_units < 10:
        listing.stock_status = WholesaleListing.STOCK_CRITICAL
    elif listing.available_units < 25:
        listing.stock_status = WholesaleListing.STOCK_LOW
    else:
        listing.stock_status = WholesaleListing.STOCK_AVAILABLE


def is_business_user(user):
    profile = getattr(user, "profile", None)
    return bool(user and user.is_authenticated and profile and profile.account_type == AccountProfile.BUSINESS)


def require_business(request):
    if not is_business_user(request.user):
        return Response({"detail": "Wholesale marketplace is only available to business accounts."}, status=status.HTTP_403_FORBIDDEN)
    return None


STOCK_IMPORT_HEADERS = [
    "sku",
    "product_name",
    "category",
    "quantity",
    "unit_cost",
    "suggested_retail_price",
    "suggested_wholesale_price",
    "min_order_quantity",
    "condition",
    "depot_location",
    "description",
    "received_at",
]


def business_store_for_user(user):
    profile = user.profile
    store, _ = Store.objects.get_or_create(
        name=profile.store_name,
        defaults={
            "city": profile.city or "Beirut",
            "address": profile.street_address,
        },
    )
    return store


def parse_decimal(value, default="0"):
    try:
        return Decimal(str(value or default).strip())
    except (InvalidOperation, ValueError):
        return Decimal(default)


def parse_int(value, default=0):
    try:
        return max(int(float(str(value or default).strip())), 0)
    except (TypeError, ValueError):
        return default


def parse_date_value(value):
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def normalize_condition(value):
    raw = str(value or Product.NEW).strip().lower().replace(" ", "_").replace("-", "_")
    valid = {choice[0] for choice in Product.CONDITION_CHOICES}
    return raw if raw in valid else Product.NEW


def parse_csv_stock(file_obj):
    content = file_obj.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)


def xlsx_cell_value(cell, shared_strings):
    value = cell.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
    if value is None:
        return ""
    text = value.text or ""
    if cell.attrib.get("t") == "s":
        return shared_strings[int(text)] if text.isdigit() and int(text) < len(shared_strings) else ""
    return text


def xlsx_column_index(cell_reference):
    letters = "".join(character for character in cell_reference if character.isalpha())
    index = 0
    for letter in letters:
        index = index * 26 + (ord(letter.upper()) - ord("A") + 1)
    return max(index - 1, 0)


def parse_xlsx_stock(file_obj):
    with zipfile.ZipFile(file_obj) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                texts = [node.text or "" for node in item.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")]
                shared_strings.append("".join(texts))

        sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row"):
            values_by_column = {}
            for cell in row.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                column_index = xlsx_column_index(cell.attrib.get("r", "A1"))
                values_by_column[column_index] = xlsx_cell_value(cell, shared_strings)
            max_column = max(values_by_column.keys(), default=-1)
            values = [values_by_column.get(index, "") for index in range(max_column + 1)]
            if any(str(value).strip() for value in values):
                rows.append(values)

    if not rows:
        return []

    headers = [str(value).strip() for value in rows[0]]
    return [dict(zip(headers, row)) for row in rows[1:]]


def parse_stock_upload(file_obj):
    name = (getattr(file_obj, "name", "") or "").lower()
    if name.endswith(".xlsx"):
        return parse_xlsx_stock(file_obj)
    return parse_csv_stock(file_obj)


class StoreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("store").all()
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Product.objects.select_related("store").all()
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if category and category != "All Categories":
            queryset = queryset.filter(category__iexact=category)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def perform_update(self, serializer):
        product = self.get_object()
        if product.seller_id != self.request.user.id:
            raise PermissionDenied("You can only edit your own listings.")
        product = serializer.save()
        sync_product_stock_status(product)
        product.save(update_fields=["stock_status", "wait_status", "demand_label", "updated_at"])

    def perform_create(self, serializer):
        product = serializer.save()
        sync_product_stock_status(product)
        product.save(update_fields=["stock_status", "wait_status", "demand_label", "updated_at"])

    def perform_destroy(self, instance):
        if instance.seller_id != self.request.user.id:
            raise PermissionDenied("You can only delete your own listings.")
        instance.delete()


@api_view(["GET"])
def homepage_data(request):
    products = Product.objects.select_related("store")
    trending = products.filter(is_trending=True)[:6]
    recommended = products.filter(is_recommended=True)[:6]
    nearby_deals = products.filter(discount_percent__gt=0).order_by("-discount_percent")[:6]

    return Response(
        {
            "metrics": [
                {"label": "Active Products", "value": "12,458", "badge": "+12%"},
                {"label": "Partner Stores", "value": "247", "badge": "+8%"},
                {"label": "Daily Searches", "value": "8,934", "badge": "+23%"},
                {"label": "Wholesale Listings", "value": "1,260", "badge": "Live"},
            ],
            "products": {
                "trending": ProductSerializer(trending, many=True).data,
                "nearbyDeals": ProductSerializer(nearby_deals, many=True).data,
                "recommended": ProductSerializer(recommended, many=True).data,
            },
        }
    )


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["GET"])
def product_deals(request, product_id):
    try:
        product = Product.objects.select_related("store").get(pk=product_id)
    except Product.DoesNotExist:
        return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    offers = Product.objects.select_related("store").filter(
        name__iexact=product.name,
        category__iexact=product.category,
    ).order_by("price", "store__name")

    stats = offers.aggregate(lowest_price=Min("price"), total_quantity=Sum("quantity"))

    return Response(
        {
            "product": ProductSerializer(product, context={"request": request}).data,
            "offers": ProductSerializer(offers, many=True, context={"request": request}).data,
            "stats": {
                "lowest_price": stats["lowest_price"] or product.price,
                "total_quantity": stats["total_quantity"] or product.quantity,
                "store_count": offers.count(),
            },
            "recommendation": summarize_product_market(offers),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_listing_request(request, product_id):
    try:
        product = Product.objects.select_for_update().select_related("seller", "store").get(pk=product_id)
    except Product.DoesNotExist:
        return Response({"detail": "Product listing not found."}, status=status.HTTP_404_NOT_FOUND)

    request_type = request.data.get("request_type")
    valid_types = dict(ListingRequest.REQUEST_TYPE_CHOICES)

    if request_type not in valid_types:
        return Response(
            {"request_type": "Choose either 'reservation' or 'delivery'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if product.quantity < 1:
        return Response(
            {"detail": "This store is out of stock for this product."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    product.quantity -= 1
    sync_product_stock_status(product)
    product.save(update_fields=["quantity", "stock_status", "wait_status", "demand_label", "updated_at"])

    listing_request = ListingRequest.objects.create(
        product=product,
        requester=request.user,
        seller=product.seller,
        store=product.store,
        request_type=request_type,
        message=request.data.get("message", "").strip(),
    )

    notification = None
    if product.seller:
        requester_name = request.user.get_full_name() or request.user.email
        request_label = listing_request.get_request_type_display().lower()
        notification = Notification.objects.create(
            recipient=product.seller,
            actor=request.user,
            listing_request=listing_request,
            title=f"New {request_label} request",
            message=f"{requester_name} requested {request_label} for {product.name} at {product.store.name}.",
        )

    return Response(
        {
            "message": f"{listing_request.get_request_type_display()} request sent.",
            "request": ListingRequestSerializer(listing_request).data,
            "notification": NotificationSerializer(notification).data if notification else None,
            "notified": notification is not None,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def orders(request):
    buying = ListingRequest.objects.filter(requester=request.user, hidden_for_requester=False).select_related(
        "product__store",
        "requester__profile",
        "seller__profile",
        "store",
    )
    selling = ListingRequest.objects.filter(seller=request.user, hidden_for_seller=False).select_related(
        "product__store",
        "requester__profile",
        "seller__profile",
        "store",
    )
    return Response(
        {
            "buying": OrderSerializer(buying, many=True, context={"request": request}).data,
            "selling": OrderSerializer(selling, many=True, context={"request": request}).data,
            "wholesale_buying": WholesaleOrderSerializer(
                WholesaleOrder.objects.filter(requester=request.user, hidden_for_requester=False).select_related(
                    "listing__store",
                    "requester__profile",
                    "seller__profile",
                    "store",
                ),
                many=True,
                context={"request": request},
            ).data,
            "wholesale_selling": WholesaleOrderSerializer(
                WholesaleOrder.objects.filter(seller=request.user, hidden_for_seller=False).select_related(
                    "listing__store",
                    "requester__profile",
                    "seller__profile",
                    "store",
                ),
                many=True,
                context={"request": request},
            ).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    try:
        order = ListingRequest.objects.select_related(
            "product__store",
            "requester__profile",
            "seller__profile",
            "store",
        ).get(
            (Q(requester=request.user, hidden_for_requester=False) | Q(seller=request.user, hidden_for_seller=False)),
            pk=order_id,
        )
    except ListingRequest.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(OrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_order(request, order_id):
    try:
        order = ListingRequest.objects.select_related(
            "product",
            "requester",
            "seller",
            "store",
        ).get(pk=order_id, seller=request.user)
    except ListingRequest.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if order.is_final:
        return Response({"detail": "This order is already completed or canceled."}, status=status.HTTP_400_BAD_REQUEST)

    order.mark_completed()

    Notification.objects.create(
        recipient=order.requester,
        actor=request.user,
        listing_request=order,
        title="Order completed",
        message=f"{order.store.name} marked your {order.get_request_type_display().lower()} for {order.product.name} as completed.",
    )

    return Response(OrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def cancel_order(request, order_id):
    try:
        order = ListingRequest.objects.select_for_update().select_related(
            "product",
            "requester",
            "seller",
            "store",
        ).get(Q(requester=request.user) | Q(seller=request.user), pk=order_id)
    except ListingRequest.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if order.is_final:
        return Response({"detail": "This order is already completed or canceled."}, status=status.HTTP_400_BAD_REQUEST)

    product = Product.objects.select_for_update().get(pk=order.product_id)
    product.quantity += 1
    sync_product_stock_status(product)
    product.save(update_fields=["quantity", "stock_status", "wait_status", "demand_label", "updated_at"])

    order.mark_canceled()

    recipient = order.seller if request.user == order.requester else order.requester
    if recipient:
        actor_name = request.user.get_full_name() or request.user.email
        Notification.objects.create(
            recipient=recipient,
            actor=request.user,
            listing_request=order,
            title="Order canceled",
            message=f"{actor_name} canceled the {order.get_request_type_display().lower()} for {order.product.name}.",
        )

    return Response(OrderSerializer(order, context={"request": request}).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_order(request, order_id):
    try:
        order = ListingRequest.objects.get(Q(requester=request.user) | Q(seller=request.user), pk=order_id)
    except ListingRequest.DoesNotExist:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    if not order.is_final:
        return Response(
            {"detail": "You can only delete completed or canceled orders."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if order.requester_id == request.user.id:
        order.hidden_for_requester = True
    if order.seller_id == request.user.id:
        order.hidden_for_seller = True
    order.save(update_fields=["hidden_for_requester", "hidden_for_seller"])

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def wholesale_listings(request):
    business_error = require_business(request)
    if business_error:
        return business_error

    if request.method == "POST":
        serializer = WholesaleListingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        listing = serializer.save()
        sync_wholesale_stock_status(listing)
        listing.save(update_fields=["stock_status", "updated_at"])
        return Response(WholesaleListingSerializer(listing, context={"request": request}).data, status=status.HTTP_201_CREATED)

    listings = WholesaleListing.objects.select_related("store", "seller").all()
    search = request.query_params.get("search")
    category = request.query_params.get("category")

    if search:
        listings = listings.filter(product_name__icontains=search)
    if category and category != "All Listings":
        if category == "Critical Stock":
            listings = listings.filter(stock_status=WholesaleListing.STOCK_CRITICAL)
        elif category == "Trending":
            listings = listings.filter(is_trending=True)
        else:
            listings = listings.filter(category__iexact=category)

    return Response(WholesaleListingSerializer(listings, many=True, context={"request": request}).data)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def wholesale_listing_detail(request, listing_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        listing = WholesaleListing.objects.select_related("store", "seller").get(pk=listing_id)
    except WholesaleListing.DoesNotExist:
        return Response({"detail": "Wholesale listing not found."}, status=status.HTTP_404_NOT_FOUND)

    if listing.seller_id != request.user.id:
        raise PermissionDenied("You can only edit your own wholesale listings.")

    if request.method == "DELETE":
        listing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = WholesaleListingSerializer(listing, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    listing = serializer.save()
    sync_wholesale_stock_status(listing)
    listing.save(update_fields=["stock_status", "updated_at"])
    return Response(WholesaleListingSerializer(listing, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_wholesale_order(request, listing_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        listing = WholesaleListing.objects.select_for_update().select_related("seller", "store").get(pk=listing_id)
    except WholesaleListing.DoesNotExist:
        return Response({"detail": "Wholesale listing not found."}, status=status.HTTP_404_NOT_FOUND)

    if listing.seller_id == request.user.id:
        return Response({"detail": "You cannot order from your own wholesale listing."}, status=status.HTTP_400_BAD_REQUEST)

    request_type = request.data.get("request_type")
    if request_type not in dict(WholesaleOrder.REQUEST_TYPE_CHOICES):
        return Response({"request_type": "Choose either 'stock_request' or 'offer'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quantity = int(request.data.get("quantity", listing.min_order_quantity))
    except (TypeError, ValueError):
        return Response({"quantity": "Enter a valid quantity."}, status=status.HTTP_400_BAD_REQUEST)

    if quantity > listing.available_units:
        return Response({"quantity": "This store does not have enough wholesale stock available."}, status=status.HTTP_400_BAD_REQUEST)
    effective_minimum = min(listing.min_order_quantity, listing.available_units) if listing.available_units > 0 else listing.min_order_quantity
    if quantity < effective_minimum:
        return Response({"quantity": f"Minimum wholesale order is {effective_minimum} units."}, status=status.HTTP_400_BAD_REQUEST)

    offer_price = request.data.get("offer_price") or None
    if request_type == WholesaleOrder.OFFER and not offer_price:
        return Response({"offer_price": "Offer price is required when sending an offer."}, status=status.HTTP_400_BAD_REQUEST)
    if offer_price is not None:
        try:
            offer_price = Decimal(str(offer_price))
        except InvalidOperation:
            return Response({"offer_price": "Enter a valid offer price."}, status=status.HTTP_400_BAD_REQUEST)

    listing.available_units -= quantity
    sync_wholesale_stock_status(listing)
    listing.save(update_fields=["available_units", "stock_status", "updated_at"])

    order = WholesaleOrder.objects.create(
        listing=listing,
        requester=request.user,
        seller=listing.seller,
        store=listing.store,
        request_type=request_type,
        quantity=quantity,
        offer_price=offer_price,
        message=request.data.get("message", "").strip(),
    )

    if listing.seller:
        requester_name = request.user.profile.store_name or request.user.get_full_name() or request.user.email
        Notification.objects.create(
            recipient=listing.seller,
            actor=request.user,
            title=f"New wholesale {order.get_request_type_display().lower()}",
            message=f"{requester_name} requested {quantity} units of {listing.product_name} from {listing.store.name}.",
        )

    return Response(
        {
            "message": f"Wholesale {order.get_request_type_display().lower()} sent.",
            "order": WholesaleOrderSerializer(order, context={"request": request}).data,
            "listing": WholesaleListingSerializer(listing, context={"request": request}).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def wholesale_order_detail(request, order_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        order = WholesaleOrder.objects.select_related(
            "listing__store",
            "requester__profile",
            "seller__profile",
            "store",
        ).get(
            (Q(requester=request.user, hidden_for_requester=False) | Q(seller=request.user, hidden_for_seller=False)),
            pk=order_id,
        )
    except WholesaleOrder.DoesNotExist:
        return Response({"detail": "Wholesale order not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(WholesaleOrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_wholesale_order(request, order_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        order = WholesaleOrder.objects.select_related("listing", "requester", "seller", "store").get(pk=order_id, seller=request.user)
    except WholesaleOrder.DoesNotExist:
        return Response({"detail": "Wholesale order not found."}, status=status.HTTP_404_NOT_FOUND)

    if order.is_final:
        return Response({"detail": "This wholesale order is already completed or canceled."}, status=status.HTTP_400_BAD_REQUEST)

    order.mark_completed()
    Notification.objects.create(
        recipient=order.requester,
        actor=request.user,
        title="Wholesale order completed",
        message=f"{order.store.name} marked your wholesale order for {order.listing.product_name} as completed.",
    )
    return Response(WholesaleOrderSerializer(order, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def cancel_wholesale_order(request, order_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        order = WholesaleOrder.objects.select_for_update().select_related("listing", "requester", "seller", "store").get(
            Q(requester=request.user) | Q(seller=request.user),
            pk=order_id,
        )
    except WholesaleOrder.DoesNotExist:
        return Response({"detail": "Wholesale order not found."}, status=status.HTTP_404_NOT_FOUND)

    if order.is_final:
        return Response({"detail": "This wholesale order is already completed or canceled."}, status=status.HTTP_400_BAD_REQUEST)

    listing = WholesaleListing.objects.select_for_update().get(pk=order.listing_id)
    listing.available_units += order.quantity
    sync_wholesale_stock_status(listing)
    listing.save(update_fields=["available_units", "stock_status", "updated_at"])
    order.mark_canceled()

    recipient = order.seller if request.user == order.requester else order.requester
    if recipient:
        actor_name = request.user.profile.store_name or request.user.get_full_name() or request.user.email
        Notification.objects.create(
            recipient=recipient,
            actor=request.user,
            title="Wholesale order canceled",
            message=f"{actor_name} canceled the wholesale order for {order.listing.product_name}.",
        )

    return Response(WholesaleOrderSerializer(order, context={"request": request}).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_wholesale_order(request, order_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        order = WholesaleOrder.objects.get(Q(requester=request.user) | Q(seller=request.user), pk=order_id)
    except WholesaleOrder.DoesNotExist:
        return Response({"detail": "Wholesale order not found."}, status=status.HTTP_404_NOT_FOUND)

    if not order.is_final:
        return Response({"detail": "You can only delete completed or canceled wholesale orders."}, status=status.HTTP_400_BAD_REQUEST)

    if order.requester_id == request.user.id:
        order.hidden_for_requester = True
    if order.seller_id == request.user.id:
        order.hidden_for_seller = True
    order.save(update_fields=["hidden_for_requester", "hidden_for_seller"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications(request):
    items = Notification.objects.filter(recipient=request.user).select_related(
        "actor",
        "listing_request__product",
        "listing_request__store",
        "listing_request__requester",
    )
    unread_count = items.filter(is_read=False).count()
    return Response(
        {
            "unread_count": unread_count,
            "results": NotificationSerializer(items[:30], many=True).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(pk=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save(update_fields=["is_read"])
    return Response(NotificationSerializer(notification).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"message": "Notifications marked as read."})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    deleted_count, _ = Notification.objects.filter(pk=notification_id, recipient=request.user).delete()

    if not deleted_count:
        return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_listings(request):
    products = Product.objects.filter(seller=request.user).select_related("store").prefetch_related(
        "listing_requests",
        "listing_requests__requester",
        "listing_requests__store",
    ).order_by("-updated_at")
    wholesale = WholesaleListing.objects.filter(seller=request.user).select_related("store", "seller").prefetch_related(
        "orders",
        "orders__requester",
        "orders__requester__profile",
        "orders__store",
    ).order_by("-updated_at")

    return Response(
        {
            "retail": MyListingSerializer(products, many=True, context={"request": request}).data,
            "wholesale": MyWholesaleListingSerializer(wholesale, many=True, context={"request": request}).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stock_items(request):
    business_error = require_business(request)
    if business_error:
        return business_error

    items = StockItem.objects.filter(owner=request.user).select_related("store").order_by("-updated_at")
    return Response(StockItemSerializer(items, many=True, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def upload_stock_items(request):
    business_error = require_business(request)
    if business_error:
        return business_error

    upload = request.FILES.get("file")
    if not upload:
        return Response({"file": "Upload a CSV or XLSX stock sheet."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows = parse_stock_upload(upload)
    except (UnicodeDecodeError, zipfile.BadZipFile, KeyError, ElementTree.ParseError):
        return Response({"file": "Could not read this sheet. Use the StockRevive template."}, status=status.HTTP_400_BAD_REQUEST)

    store = business_store_for_user(request.user)
    imported = []
    skipped = 0

    for row in rows:
        normalized = {str(key or "").strip().lower(): value for key, value in row.items()}
        product_name = str(normalized.get("product_name", "")).strip()
        category = str(normalized.get("category", "")).strip()
        quantity = parse_int(normalized.get("quantity"), 0)

        if not product_name or not category:
            skipped += 1
            continue

        item = StockItem.objects.create(
            owner=request.user,
            store=store,
            sku=str(normalized.get("sku", "")).strip(),
            product_name=product_name,
            category=category,
            quantity=quantity,
            unit_cost=parse_decimal(normalized.get("unit_cost")),
            suggested_retail_price=parse_decimal(normalized.get("suggested_retail_price")),
            suggested_wholesale_price=parse_decimal(normalized.get("suggested_wholesale_price")),
            min_order_quantity=max(parse_int(normalized.get("min_order_quantity"), 1), 1),
            condition=normalize_condition(normalized.get("condition")),
            depot_location=str(normalized.get("depot_location", "")).strip(),
            description=str(normalized.get("description", "")).strip(),
            source_file=upload.name[:180],
            received_at=parse_date_value(normalized.get("received_at")),
        )
        imported.append(item)

    return Response(
        {
            "message": f"Imported {len(imported)} stock items.",
            "imported_count": len(imported),
            "skipped_count": skipped,
            "items": StockItemSerializer(imported, many=True, context={"request": request}).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_stock_listing(request, stock_item_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    try:
        stock_item = StockItem.objects.select_for_update().select_related("store").get(pk=stock_item_id, owner=request.user)
    except StockItem.DoesNotExist:
        return Response({"detail": "Stock item not found."}, status=status.HTTP_404_NOT_FOUND)

    listing_type = request.data.get("listing_type")
    quantity = parse_int(request.data.get("quantity"), stock_item.quantity)
    if quantity < 1:
        return Response({"quantity": "Quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)
    if quantity > stock_item.quantity:
        return Response({"quantity": "You cannot list more units than are available in depot stock."}, status=status.HTTP_400_BAD_REQUEST)

    if listing_type == "retail":
        price = parse_decimal(request.data.get("price"), stock_item.suggested_retail_price)
        product = Product.objects.create(
            name=stock_item.product_name,
            category=stock_item.category,
            description=stock_item.description,
            price=price,
            quantity=quantity,
            condition=stock_item.condition,
            seller=request.user,
            store=stock_item.store,
            seller_name=request.user.profile.store_name,
            seller_phone=request.user.profile.business_phone or request.user.profile.phone,
        )
        sync_product_stock_status(product)
        product.save(update_fields=["stock_status", "wait_status", "demand_label", "updated_at"])
        stock_item.quantity -= quantity
        stock_item.save(update_fields=["quantity", "updated_at"])
        return Response(
            {
                "message": "Retail listing created from stock.",
                "stock_item": StockItemSerializer(stock_item, context={"request": request}).data,
                "listing": ProductSerializer(product, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    if listing_type == "wholesale":
        price = parse_decimal(request.data.get("price"), stock_item.suggested_wholesale_price)
        min_order_quantity = max(parse_int(request.data.get("min_order_quantity"), stock_item.min_order_quantity), 1)
        listing = WholesaleListing.objects.create(
            seller=request.user,
            store=stock_item.store,
            product_name=stock_item.product_name,
            category=stock_item.category,
            description=stock_item.description,
            wholesale_price=price,
            available_units=quantity,
            min_order_quantity=min(min_order_quantity, quantity),
            city=stock_item.store.city,
        )
        sync_wholesale_stock_status(listing)
        listing.save(update_fields=["stock_status", "updated_at"])
        stock_item.quantity -= quantity
        stock_item.save(update_fields=["quantity", "updated_at"])
        return Response(
            {
                "message": "Wholesale listing created from stock.",
                "stock_item": StockItemSerializer(stock_item, context={"request": request}).data,
                "listing": WholesaleListingSerializer(listing, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response({"listing_type": "Choose either 'retail' or 'wholesale'."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_stock_item(request, stock_item_id):
    business_error = require_business(request)
    if business_error:
        return business_error

    deleted_count, _ = StockItem.objects.filter(pk=stock_item_id, owner=request.user).delete()
    if not deleted_count:
        return Response({"detail": "Stock item not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_all_stock_items(request):
    business_error = require_business(request)
    if business_error:
        return business_error

    deleted_count, _ = StockItem.objects.filter(owner=request.user).delete()
    return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)


@api_view(["POST"])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "message": "Account created successfully.",
            "token": token.key,
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]
    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "message": "Logged in successfully.",
            "token": token.key,
            "user": UserSerializer(user).data,
        }
    )


@api_view(["POST"])
def logout_user(request):
    if request.auth:
        request.auth.delete()
    logout(request)
    return Response({"message": "Logged out successfully."})


@api_view(["GET"])
def current_user(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(UserSerializer(request.user).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_account_settings(request):
    serializer = AccountSettingsSerializer(request.user, data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(
        {
            "message": "Settings updated successfully.",
            "user": UserSerializer(user).data,
        }
    )
