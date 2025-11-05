from django.db import migrations, models
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('packaging_management', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='packagingpayment',
            name='action_type',
            field=models.CharField(choices=[('payment', 'Payment'), ('settle', 'Settlement')], default='payment', max_length=20),
        ),
        migrations.AlterField(
            model_name='packagingpayment',
            name='amount',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
        ),
        migrations.AlterField(
            model_name='packagingpayment',
            name='payment_method',
            field=models.CharField(choices=[('none', 'None'), ('cash', 'Cash'), ('card', 'Card'), ('mobile_money', 'Mobile Money'), ('bank_transfer', 'Bank Transfer')], max_length=20),
        ),
    ]


