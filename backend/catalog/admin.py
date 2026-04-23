from django.contrib import admin

from .models import AccountProfile, ListingRequest, Notification, Product, Store, WholesaleListing, WholesaleOrder


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "rating")
    search_fields = ("name", "city")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "stock_status", "wait_status", "store")
    list_filter = ("category", "stock_status", "wait_status", "is_trending", "is_recommended")
    search_fields = ("name", "category", "store__name")


@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "account_type", "store_name", "phone", "city", "business_phone", "created_at")
    list_filter = ("account_type",)
    search_fields = ("user__email", "user__first_name", "user__last_name", "store_name", "city", "street_address")


@admin.register(ListingRequest)
class ListingRequestAdmin(admin.ModelAdmin):
    list_display = ("product", "store", "requester", "seller", "request_type", "status", "created_at", "completed_at")
    list_filter = ("request_type", "status", "created_at")
    search_fields = ("product__name", "store__name", "requester__email", "seller__email")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "actor", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("title", "message", "recipient__email", "actor__email")


@admin.register(WholesaleListing)
class WholesaleListingAdmin(admin.ModelAdmin):
    list_display = ("product_name", "category", "wholesale_price", "available_units", "stock_status", "demand_level", "store")
    list_filter = ("category", "stock_status", "demand_level", "is_trending")
    search_fields = ("product_name", "category", "store__name")


@admin.register(WholesaleOrder)
class WholesaleOrderAdmin(admin.ModelAdmin):
    list_display = ("listing", "store", "requester", "seller", "request_type", "quantity", "status", "created_at")
    list_filter = ("request_type", "status", "created_at")
    search_fields = ("listing__product_name", "store__name", "requester__email", "seller__email")
