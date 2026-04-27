from django.conf import settings
from django.db import models
from django.utils import timezone


class Store(models.Model):
    name = models.CharField(max_length=160)
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.5)

    def __str__(self):
        return self.name


class Product(models.Model):
    STOCK_HIGH = "in_stock"
    STOCK_LOW = "low_stock"
    STOCK_OUT = "out_of_stock"

    STOCK_STATUS_CHOICES = [
        (STOCK_HIGH, "In stock"),
        (STOCK_LOW, "Low stock"),
        (STOCK_OUT, "Out of stock"),
    ]

    NEW = "new"
    OPEN_BOX = "open_box"
    USED = "used"
    REFURBISHED = "refurbished"

    CONDITION_CHOICES = [
        (NEW, "New"),
        (OPEN_BOX, "Open box"),
        (USED, "Used"),
        (REFURBISHED, "Refurbished"),
    ]

    BUY_NOW = "buy_now"
    WORTH_WAITING = "worth_waiting"
    PRICE_DROP = "price_drop"

    WAIT_STATUS_CHOICES = [
        (BUY_NOW, "Buy Now"),
        (WORTH_WAITING, "Worth Waiting"),
        (PRICE_DROP, "Price May Drop"),
    ]

    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default=NEW)
    image_url = models.URLField(blank=True)
    image = models.FileField(upload_to="products/", blank=True)
    stock_status = models.CharField(
        max_length=20,
        choices=STOCK_STATUS_CHOICES,
        default=STOCK_HIGH,
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="product_listings",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    store = models.ForeignKey(Store, related_name="products", on_delete=models.CASCADE)
    seller_name = models.CharField(max_length=160, blank=True)
    seller_phone = models.CharField(max_length=40, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.8)
    distance_miles = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)
    store_count = models.PositiveSmallIntegerField(default=1)
    wait_status = models.CharField(max_length=20, choices=WAIT_STATUS_CHOICES, default=BUY_NOW)
    demand_label = models.CharField(max_length=80, blank=True)
    is_trending = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    discount_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class AccountProfile(models.Model):
    CUSTOMER = "customer"
    BUSINESS = "business"

    ACCOUNT_TYPE_CHOICES = [
        (CUSTOMER, "Normal user"),
        (BUSINESS, "Business account"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="profile", on_delete=models.CASCADE)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default=CUSTOMER)
    store_name = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    city = models.CharField(max_length=100, blank=True)
    street_address = models.CharField(max_length=255, blank=True)
    building_details = models.CharField(max_length=160, blank=True)
    business_phone = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.account_type})"


class ListingRequest(models.Model):
    RESERVATION = "reservation"
    DELIVERY = "delivery"

    REQUEST_TYPE_CHOICES = [
        (RESERVATION, "Reservation"),
        (DELIVERY, "Delivery"),
    ]

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    CANCELED = "canceled"
    COMPLETED = "completed"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (CONFIRMED, "Confirmed"),
        (DECLINED, "Declined"),
        (CANCELED, "Canceled"),
        (COMPLETED, "Completed"),
    ]

    product = models.ForeignKey(Product, related_name="listing_requests", on_delete=models.CASCADE)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sent_listing_requests",
        on_delete=models.CASCADE,
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_listing_requests",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    store = models.ForeignKey(Store, related_name="listing_requests", on_delete=models.CASCADE)
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    hidden_for_requester = models.BooleanField(default=False)
    hidden_for_seller = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_request_type_display()} for {self.product.name}"

    def mark_completed(self):
        self.status = self.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def mark_canceled(self):
        self.status = self.CANCELED
        self.canceled_at = timezone.now()
        self.save(update_fields=["status", "canceled_at"])

    @property
    def is_final(self):
        return self.status in [self.COMPLETED, self.CANCELED]


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="notifications",
        on_delete=models.CASCADE,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="triggered_notifications",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    listing_request = models.ForeignKey(
        ListingRequest,
        related_name="notifications",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class WholesaleListing(models.Model):
    STOCK_AVAILABLE = "available"
    STOCK_LOW = "low"
    STOCK_CRITICAL = "critical"

    STOCK_STATUS_CHOICES = [
        (STOCK_AVAILABLE, "Available"),
        (STOCK_LOW, "Low Stock"),
        (STOCK_CRITICAL, "Critical Stock"),
    ]

    DEMAND_LOW = "low"
    DEMAND_MEDIUM = "medium"
    DEMAND_HIGH = "high"

    DEMAND_CHOICES = [
        (DEMAND_LOW, "Low Demand"),
        (DEMAND_MEDIUM, "Medium Demand"),
        (DEMAND_HIGH, "High Demand"),
    ]

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="wholesale_listings",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    store = models.ForeignKey(Store, related_name="wholesale_listings", on_delete=models.CASCADE)
    product_name = models.CharField(max_length=180)
    category = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2)
    available_units = models.PositiveIntegerField(default=0)
    min_order_quantity = models.PositiveIntegerField(default=5)
    city = models.CharField(max_length=100, blank=True)
    distance_miles = models.DecimalField(max_digits=5, decimal_places=1, default=1.0)
    stock_status = models.CharField(max_length=20, choices=STOCK_STATUS_CHOICES, default=STOCK_AVAILABLE)
    demand_level = models.CharField(max_length=20, choices=DEMAND_CHOICES, default=DEMAND_MEDIUM)
    is_trending = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product_name"]

    def __str__(self):
        return self.product_name


class WholesaleOrder(models.Model):
    STOCK_REQUEST = "stock_request"
    OFFER = "offer"

    REQUEST_TYPE_CHOICES = [
        (STOCK_REQUEST, "Stock Request"),
        (OFFER, "Offer"),
    ]

    PENDING = "pending"
    COMPLETED = "completed"
    CANCELED = "canceled"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (COMPLETED, "Completed"),
        (CANCELED, "Canceled"),
    ]

    listing = models.ForeignKey(WholesaleListing, related_name="orders", on_delete=models.CASCADE)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="sent_wholesale_orders",
        on_delete=models.CASCADE,
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="received_wholesale_orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    store = models.ForeignKey(Store, related_name="wholesale_orders", on_delete=models.CASCADE)
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    quantity = models.PositiveIntegerField(default=1)
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    hidden_for_requester = models.BooleanField(default=False)
    hidden_for_seller = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_request_type_display()} for {self.listing.product_name}"

    def mark_completed(self):
        self.status = self.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def mark_canceled(self):
        self.status = self.CANCELED
        self.canceled_at = timezone.now()
        self.save(update_fields=["status", "canceled_at"])

    @property
    def is_final(self):
        return self.status in [self.COMPLETED, self.CANCELED]

    @property
    def unit_price(self):
        return self.offer_price or self.listing.wholesale_price


class StockItem(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="stock_items", on_delete=models.CASCADE)
    store = models.ForeignKey(Store, related_name="stock_items", on_delete=models.CASCADE)
    sku = models.CharField(max_length=80, blank=True)
    product_name = models.CharField(max_length=180)
    category = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    suggested_retail_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    suggested_wholesale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_order_quantity = models.PositiveIntegerField(default=1)
    condition = models.CharField(max_length=20, choices=Product.CONDITION_CHOICES, default=Product.NEW)
    depot_location = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    source_file = models.CharField(max_length=180, blank=True)
    received_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product_name", "sku"]

    def __str__(self):
        return f"{self.product_name} ({self.quantity})"
