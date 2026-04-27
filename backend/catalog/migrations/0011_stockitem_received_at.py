from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_stockitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockitem",
            name="received_at",
            field=models.DateField(blank=True, null=True),
        ),
    ]
