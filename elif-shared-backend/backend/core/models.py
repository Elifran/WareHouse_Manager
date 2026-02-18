from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('sales', 'Sales Agent'),
        ('manager', 'Manager'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='sales')
    phone_number = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} - {self.role}"
    
    class Meta:
        db_table = 'core_user'


class Store(models.Model):
    """Store configuration model for managing store information"""
    name = models.CharField(max_length=200, unique=True, help_text="Store name")
    owner = models.CharField(max_length=200, blank=True, help_text="Store owner name")
    address = models.TextField(blank=True, help_text="Store address")
    phone = models.CharField(max_length=20, blank=True, help_text="Store phone number")
    email = models.EmailField(blank=True, help_text="Store email address")
    is_active = models.BooleanField(default=True, help_text="Whether the store is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'core_store'
        ordering = ['name']
