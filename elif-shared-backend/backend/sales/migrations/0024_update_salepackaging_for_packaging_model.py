# Generated manually for packaging architecture refactoring

from decimal import Decimal
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0023_sale_created_by'),
        ('products', '0022_add_packaging_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='salepackaging',
            name='packaging',
            field=models.ForeignKey(blank=True, help_text='Packaging type (e.g., bottle, can)', null=True, on_delete=django.db.models.deletion.PROTECT, to='products.packaging'),
        ),
        migrations.AlterField(
            model_name='salepackaging',
            name='product',
            field=models.ForeignKey(blank=True, help_text='Legacy field - kept for backward compatibility', null=True, on_delete=django.db.models.deletion.SET_NULL, to='products.product'),
        ),
        migrations.AlterField(
            model_name='salepackaging',
            name='unit',
            field=models.ForeignKey(blank=True, help_text='Legacy field - kept for backward compatibility', null=True, on_delete=django.db.models.deletion.SET_NULL, to='products.unit'),
        ),
        migrations.AlterField(
            model_name='salepackaging',
            name='quantity',
            field=models.FloatField(help_text='Total quantity of packaging items (aggregated from all products)', validators=[django.core.validators.MinValueValidator(0.001)]),
        ),
        migrations.AlterField(
            model_name='salepackaging',
            name='unit_price',
            field=models.DecimalField(decimal_places=2, help_text='Packaging price per unit (from packaging model)', max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))]),
        ),
        migrations.AlterUniqueTogether(
            name='salepackaging',
            unique_together={('sale', 'packaging')},
        ),
    ]

