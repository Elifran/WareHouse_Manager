# Generated manually for Store model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Store name', max_length=200, unique=True)),
                ('owner', models.CharField(blank=True, help_text='Store owner name', max_length=200)),
                ('address', models.TextField(blank=True, help_text='Store address')),
                ('phone', models.CharField(blank=True, help_text='Store phone number', max_length=20)),
                ('email', models.EmailField(blank=True, help_text='Store email address', max_length=254)),
                ('is_active', models.BooleanField(default=True, help_text='Whether the store is active')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'core_store',
                'ordering': ['name'],
            },
        ),
    ]
