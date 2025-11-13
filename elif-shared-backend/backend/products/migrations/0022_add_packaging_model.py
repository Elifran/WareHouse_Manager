# Generated manually for packaging architecture refactoring

from decimal import Decimal
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0021_product_standard_price_1_product_standard_price_2_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Packaging',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text="Packaging name (e.g., 'Bottle', 'Can', 'Box')", max_length=200, unique=True)),
                ('price', models.DecimalField(decimal_places=2, help_text='Packaging price per unit', max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('description', models.TextField(blank=True, help_text='Optional description of the packaging')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this packaging is currently active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name_plural': 'Packagings',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='product',
            name='packaging',
            field=models.ForeignKey(blank=True, help_text='Packaging type for this product (e.g., bottle, can)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='products', to='products.packaging'),
        ),
        migrations.AlterField(
            model_name='product',
            name='has_packaging',
            field=models.BooleanField(default=False, help_text='Whether this product has packaging consignation (legacy - use packaging field instead)'),
        ),
        migrations.AlterField(
            model_name='product',
            name='packaging_price',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Packaging consignation price (legacy - use packaging.price instead)', max_digits=10, null=True, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
        ),
    ]

