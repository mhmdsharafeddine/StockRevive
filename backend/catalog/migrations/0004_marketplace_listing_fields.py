from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0003_product_listing_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="condition",
            field=models.CharField(
                choices=[
                    ("new", "New"),
                    ("open_box", "Open box"),
                    ("used", "Used"),
                    ("refurbished", "Refurbished"),
                ],
                default="new",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="product",
            name="seller_name",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="product",
            name="seller_phone",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
