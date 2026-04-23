from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_accountprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="demand_label",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="product",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="product",
            name="distance_miles",
            field=models.DecimalField(decimal_places=1, default=1.0, max_digits=4),
        ),
        migrations.AddField(
            model_name="product",
            name="image",
            field=models.FileField(blank=True, upload_to="products/"),
        ),
        migrations.AddField(
            model_name="product",
            name="rating",
            field=models.DecimalField(decimal_places=1, default=4.8, max_digits=3),
        ),
        migrations.AddField(
            model_name="product",
            name="store_count",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="product",
            name="wait_status",
            field=models.CharField(
                choices=[
                    ("buy_now", "Buy Now"),
                    ("worth_waiting", "Worth Waiting"),
                    ("price_drop", "Price May Drop"),
                ],
                default="buy_now",
                max_length=20,
            ),
        ),
    ]
