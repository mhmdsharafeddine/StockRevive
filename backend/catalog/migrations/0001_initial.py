from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Store",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("city", models.CharField(max_length=100)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("rating", models.DecimalField(decimal_places=2, default=4.5, max_digits=3)),
            ],
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=180)),
                ("category", models.CharField(max_length=120)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("image_url", models.URLField(blank=True)),
                (
                    "stock_status",
                    models.CharField(
                        choices=[
                            ("in_stock", "In stock"),
                            ("low_stock", "Low stock"),
                            ("out_of_stock", "Out of stock"),
                        ],
                        default="in_stock",
                        max_length=20,
                    ),
                ),
                ("is_trending", models.BooleanField(default=False)),
                ("is_recommended", models.BooleanField(default=False)),
                ("discount_percent", models.PositiveSmallIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "store",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="products",
                        to="catalog.store",
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
    ]
